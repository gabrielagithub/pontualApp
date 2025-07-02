import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const colorOptions = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Amarelo" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#8B5CF6", label: "Roxo" },
];

interface QuickTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (taskId: number) => void;
}

export default function QuickTaskForm({ isOpen, onClose, onTaskCreated }: QuickTaskFormProps) {
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const { toast } = useToast();

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      isActive: true,
      estimatedHours: null,
      deadline: null,
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: InsertTask) => apiRequest("POST", "/api/tasks", data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Atividade criada com sucesso",
      });
      
      if (onTaskCreated && response?.id) {
        onTaskCreated(response.id);
      }
      
      onClose();
      form.reset();
      setSelectedColor("#3B82F6");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar atividade",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTask) => {
    // Convert minutes to hours for backend storage
    const taskData = { 
      ...data, 
      color: selectedColor,
      estimatedHours: data.estimatedHours ? data.estimatedHours / 60 : null
    };
    
    createTaskMutation.mutate(taskData);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    form.setValue("color", color);
  };

  const handleClose = () => {
    onClose();
    form.reset();
    setSelectedColor("#3B82F6");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Atividade</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Atividade *</FormLabel>
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
                      placeholder="Descreva o que será feito nesta atividade"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <div className="space-y-2">
              <Label>Cor da Atividade</Label>
              <div className="flex space-x-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color.value ? "border-gray-700" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleColorSelect(color.value)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="estimatedHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tempo Estimado (minutos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 120 (para 2 horas)"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    />
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
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? "Criando..." : "Criar Atividade"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}