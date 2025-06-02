import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTaskSchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Trash2 } from "lucide-react";
import type { TaskWithStats, InsertTask, TaskItem } from "@shared/schema";
import { z } from "zod";

const colorOptions = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Amarelo" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#8B5CF6", label: "Roxo" },
];

interface TaskModalProps {
  task?: TaskWithStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskModal({ task, isOpen, onClose }: TaskModalProps) {
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [newItemTitle, setNewItemTitle] = useState("");
  const { toast } = useToast();

  const { data: taskItems } = useQuery<TaskItem[]>({
    queryKey: [`/api/tasks/${task?.id}/items`],
    enabled: !!task?.id && isOpen,
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      isActive: true,
    },
  });

  // Update form when task changes
  useEffect(() => {
    if (task) {
      const deadlineValue = task.deadline ? 
        new Date(task.deadline).toISOString().slice(0, 16) : "";
      
      form.reset({
        name: task.name,
        description: task.description || "",
        color: task.color,
        isActive: task.isActive,
        estimatedHours: task.estimatedHours ? Math.round(task.estimatedHours * 60) : null,
        deadline: deadlineValue,
      });
      setSelectedColor(task.color);
    } else {
      form.reset({
        name: "",
        description: "",
        color: "#3B82F6",
        isActive: true,
        estimatedHours: null,
        deadline: "",
      });
      setSelectedColor("#3B82F6");
    }
  }, [task, form]);

  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Atividade criada com sucesso",
      });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar atividade",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => 
      apiRequest("PUT", `/api/tasks/${task?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Atividade atualizada com sucesso",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar atividade",
        variant: "destructive",
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (title: string) => 
      apiRequest("POST", `/api/tasks/${task?.id}/items`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/items`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setNewItemTitle("");
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest("PUT", `/api/task-items/${id}`, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/items`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/task-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/items`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const onSubmit = (data: InsertTask) => {
    // Convert minutes to hours for backend storage
    const taskData = { 
      ...data, 
      color: selectedColor,
      estimatedHours: data.estimatedHours ? data.estimatedHours / 60 : null
    };
    
    if (task) {
      updateTaskMutation.mutate(taskData);
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    form.setValue("color", color);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {task ? "Editar Atividade" : "Nova Atividade"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Atividade</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o nome da atividade"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a atividade (opcional)"
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo Previsto</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder="Horas"
                            min="0"
                            max="999"
                            value={Math.floor((field.value || 0) / 60)}
                            onChange={(e) => {
                              const hours = parseInt(e.target.value) || 0;
                              const minutes = (field.value || 0) % 60;
                              field.onChange(hours * 60 + minutes);
                            }}
                          />
                        </div>
                        <span className="flex items-center text-sm text-gray-500">h</span>
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder="Min"
                            min="0"
                            max="59"
                            value={(field.value || 0) % 60}
                            onChange={(e) => {
                              const minutes = parseInt(e.target.value) || 0;
                              const hours = Math.floor((field.value || 0) / 60);
                              field.onChange(hours * 60 + minutes);
                            }}
                          />
                        </div>
                        <span className="flex items-center text-sm text-gray-500">min</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : new Date(field.value).toISOString().split('T')[0]) : ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Cor</Label>
              <div className="flex space-x-2 mt-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleColorSelect(option.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      selectedColor === option.value
                        ? "border-gray-400 ring-2 ring-gray-300"
                        : "border-transparent hover:border-gray-300"
                    }`}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            {/* Task Items (Checklist) */}
            {task && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Lista de Tarefas</Label>
                
                {/* Add new item */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Adicionar nova tarefa..."
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && newItemTitle.trim()) {
                        createItemMutation.mutate(newItemTitle.trim());
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (newItemTitle.trim()) {
                        createItemMutation.mutate(newItemTitle.trim());
                      }
                    }}
                    disabled={createItemMutation.isPending || !newItemTitle.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Task items list */}
                {taskItems && taskItems.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    <div className="text-xs text-gray-500 mb-2">
                      {taskItems.filter(item => item.completed).length} de {taskItems.length} concluídas
                    </div>
                    {taskItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={(checked) => {
                            updateItemMutation.mutate({
                              id: item.id,
                              completed: Boolean(checked)
                            });
                          }}
                        />
                        <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                          {item.title}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          disabled={deleteItemMutation.isPending}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
              >
                {createTaskMutation.isPending || updateTaskMutation.isPending
                  ? "Salvando..."
                  : "Salvar"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
