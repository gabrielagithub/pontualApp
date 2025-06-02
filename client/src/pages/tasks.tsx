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

  // Lógica de filtros
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter(task => {
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
  }, [tasks, searchTerm, statusFilter, colorFilter]);

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
                {filteredTasks.length} de {tasks?.length || 0} atividades
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {filteredTasks && filteredTasks.length > 0 ? (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
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
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
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

      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
