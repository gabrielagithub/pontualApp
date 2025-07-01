import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Search, Filter } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TaskModal from "@/components/task-modal";
import { formatDuration } from "@/lib/timer-utils";
import { apiRequest } from "@/lib/queryClient";
import type { TaskWithStats } from "@shared/schema";

export default function Tasks() {
  const [selectedTask, setSelectedTask] = useState<TaskWithStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery<TaskWithStats[]>({
    queryKey: ["/api/tasks"],
  });

  // Separar tarefas ativas e concluídas
  const { activeTasks, completedTasks } = useMemo(() => {
    if (!tasks) return { activeTasks: [], completedTasks: [] };

    const active = tasks.filter(task => !task.isCompleted);
    const completed = tasks.filter(task => task.isCompleted);

    return { activeTasks: active, completedTasks: completed };
  }, [tasks]);

  // Lógica de filtros para tarefas ativas
  const filteredActiveTasks = useMemo(() => {
    return activeTasks.filter(task => {
      // Filtro por busca (nome ou descrição)
      const matchesSearch = searchTerm === "" || 
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por status
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && task.isActive) ||
        (statusFilter === "inactive" && !task.isActive);

      // Filtro por cor
      const matchesColor = colorFilter === "all" || task.color === colorFilter;

      return matchesSearch && matchesStatus && matchesColor;
    });
  }, [activeTasks, searchTerm, statusFilter, colorFilter]);

  // Lógica de filtros para tarefas concluídas
  const filteredCompletedTasks = useMemo(() => {
    return completedTasks.filter(task => {
      // Filtro por busca (nome ou descrição)
      const matchesSearch = searchTerm === "" || 
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por cor
      const matchesColor = colorFilter === "all" || task.color === colorFilter;

      return matchesSearch && matchesColor;
    });
  }, [completedTasks, searchTerm, colorFilter]);

  // Cores únicas disponíveis
  const availableColors = useMemo(() => {
    if (!tasks) return [];
    const colors = Array.from(new Set(tasks.map(task => task.color)));
    return colors.sort();
  }, [tasks]);

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Sucesso",
        description: "Atividade excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir atividade",
        variant: "destructive",
      });
    },
  });

  const reopenTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/tasks/${id}/reopen`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Sucesso",
        description: "Atividade reaberta com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao reabrir atividade",
        variant: "destructive",
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/tasks/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Sucesso",
        description: "Atividade concluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao concluir atividade",
        variant: "destructive",
      });
    },
  });

  const handleEditTask = (task: TaskWithStats) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta atividade?")) {
      deleteTaskMutation.mutate(id);
    }
  };

  const handleReopenTask = (id: number) => {
    if (window.confirm("Tem certeza que deseja reabrir esta atividade?")) {
      reopenTaskMutation.mutate(id);
    }
  };

  const handleCompleteTask = (id: number) => {
    if (window.confirm("Tem certeza que deseja concluir esta atividade?")) {
      completeTaskMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Gerenciar Atividades</h3>
          <Button onClick={handleNewTask}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Atividade
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Gerenciar Atividades</h3>
        <Button onClick={handleNewTask}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
      </div>
      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>
            
            {/* Busca */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar atividades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>

            {/* Cor */}
            <Select value={colorFilter} onValueChange={setColorFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Cor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cores</SelectItem>
                {availableColors.map((color) => (
                  <SelectItem key={color} value={color}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full border border-gray-300" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="capitalize">
                        {color === '#EF4444' ? 'Vermelho' :
                         color === '#F59E0B' ? 'Amarelo' :
                         color === '#10B981' ? 'Verde' :
                         color === '#3B82F6' ? 'Azul' :
                         color === '#8B5CF6' ? 'Roxo' :
                         color === '#F97316' ? 'Laranja' :
                         color === '#06B6D4' ? 'Ciano' :
                         color === '#84CC16' ? 'Lima' : 'Personalizada'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Contador de resultados */}
            {(searchTerm || statusFilter !== "all" || colorFilter !== "all") && (
              <div className="text-sm text-gray-500">
                {filteredActiveTasks.length + filteredCompletedTasks.length} de {tasks?.length || 0} atividades
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Atividades Ativas */}
      <Card>
        <CardContent className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Atividades</h4>
          {filteredActiveTasks && filteredActiveTasks.length > 0 ? (
            <div className="space-y-4">
              {filteredActiveTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: task.color }}
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{task.name}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600">{task.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-sm text-gray-500">
                        Total: {formatDuration(task.totalTime)}
                      </span>
                      {task.activeEntries > 0 && (
                        <div className="text-xs text-primary">
                          {task.activeEntries} sessão(ões) ativa(s)
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completeTaskMutation.isPending}
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      ✓ Concluir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditTask(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deleteTaskMutation.isPending}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                {(searchTerm || statusFilter !== "all" || colorFilter !== "all") ? (
                  <Search className="h-full w-full" />
                ) : (
                  <Plus className="h-full w-full" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {(searchTerm || statusFilter !== "all" || colorFilter !== "all") 
                  ? "Nenhuma atividade encontrada" 
                  : "Nenhuma atividade criada"}
              </h3>
              <p className="text-gray-500 mb-4">
                {(searchTerm || statusFilter !== "all" || colorFilter !== "all") 
                  ? "Tente ajustar os filtros para encontrar suas atividades." 
                  : "Comece criando sua primeira atividade para começar a rastrear o tempo."}
              </p>
              <Button onClick={handleNewTask}>
                <Plus className="mr-2 h-4 w-4" />
                {(searchTerm || statusFilter !== "all" || colorFilter !== "all") 
                  ? "Nova Atividade" 
                  : "Criar primeira atividade"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Atividades Concluídas */}
      {filteredCompletedTasks && filteredCompletedTasks.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Atividades Concluídas</h4>
            <div className="space-y-4">
              {filteredCompletedTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 opacity-75"
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: task.color }}
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {task.name}
                        <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          ✓ Concluída
                        </span>
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-600">{task.description}</p>
                      )}
                      {task.completedAt && (
                        <p className="text-xs text-gray-500">
                          Concluída em {new Date(task.completedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-sm text-gray-500">
                        Total: {formatDuration(task.totalTime)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReopenTask(task.id)}
                      disabled={reopenTaskMutation.isPending}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      Reabrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTask(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deleteTaskMutation.isPending}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
