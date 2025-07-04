import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Search, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDuration } from "@/lib/timer-utils";
import { apiRequest } from "@/lib/queryClient";
import type { TimeEntryWithTask, TaskWithStats, UpdateTimeEntry } from "@shared/schema";

export default function History() {
  // Estados principais
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Estados para edição
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithTask | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const { toast } = useToast();

  // Consultas
  const { data: timeEntries, isLoading: entriesLoading } = useQuery<TimeEntryWithTask[]>({
    queryKey: ["/api/time-entries"],
  });

  // Log quando os dados mudarem
  useEffect(() => {
    console.log("🔄 FRONTEND: Time entries recebidas:", timeEntries?.length || 0, timeEntries);
  }, [timeEntries]);

  const { data: tasks, isLoading: tasksLoading } = useQuery<TaskWithStats[]>({
    queryKey: ["/api/tasks"],
  });

  // Mutations
  const deleteEntryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/time-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Entrada de tempo excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir entrada de tempo",
        variant: "destructive",
      });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateTimeEntry }) => 
      apiRequest("PUT", `/api/time-entries/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setEditingEntry(null);
      toast({
        title: "Sucesso",
        description: "Entrada de tempo atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar entrada de tempo",
        variant: "destructive",
      });
    },
  });

  // Funções
  const handleDeleteEntry = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta entrada de tempo?")) {
      deleteEntryMutation.mutate(id);
    }
  };

  const handleEditEntry = (entry: TimeEntryWithTask) => {
    setEditingEntry(entry);
    setEditTaskId(entry.taskId);
    setEditNotes(entry.notes || "");
    
    // Format dates for datetime-local input
    if (entry.startTime) {
      const startDate = new Date(entry.startTime);
      setEditStartTime(startDate.toISOString().slice(0, 16));
    }
    if (entry.endTime) {
      const endDate = new Date(entry.endTime);
      setEditEndTime(endDate.toISOString().slice(0, 16));
    }
  };

  const handleSaveEdit = () => {
    if (!editingEntry || !editTaskId || !editStartTime || !editEndTime) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const startTime = new Date(editStartTime);
    const endTime = new Date(editEndTime);
    
    if (endTime <= startTime) {
      toast({
        title: "Erro",
        description: "A hora de fim deve ser posterior à hora de início",
        variant: "destructive",
      });
      return;
    }

    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const updates: UpdateTimeEntry = {
      taskId: editTaskId,
      startTime: startTime,
      endTime: endTime,
      duration,
      notes: editNotes || null,
    };

    updateEntryMutation.mutate({ id: editingEntry.id, updates });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditTaskId(null);
    setEditStartTime("");
    setEditEndTime("");
    setEditNotes("");
  };

  // Filtrar entradas
  const filteredEntries = timeEntries?.filter((entry) => {
    const entryDate = new Date(entry.startTime || entry.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && entryDate < start) return false;
    if (end && entryDate > end) return false;
    if (selectedTaskId && selectedTaskId !== "all" && entry.taskId.toString() !== selectedTaskId) return false;

    return true;
  }) || [];

  // Funções do calendário
  const getDailyHours = (date: Date): number => {
    if (!timeEntries) return 0;
    
    const dayEntries = timeEntries.filter((entry) => {
      const entryDate = new Date(entry.startTime || entry.createdAt);
      return entryDate.toDateString() === date.toDateString() && entry.duration;
    });
    
    return dayEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    const now = new Date();
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    
    // Permitir apenas mês atual e meses anteriores
    if (nextMonth <= now) {
      setCurrentMonth(nextMonth);
    }
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Adicionar células vazias para dias antes do primeiro dia do mês
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Adicionar dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }

    return days;
  };

  if (entriesLoading || tasksLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando histórico...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Histórico de Tempo</h3>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="start-date">Data de Início</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">Data de Fim</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="task-filter">Filtrar por Atividade</Label>
                  <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as atividades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as atividades</SelectItem>
                      {tasks?.map((task) => (
                        <SelectItem key={task.id} value={task.id.toString()}>
                          {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setSelectedTaskId("");
                    }}
                    className="w-full"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Entradas */}
          <Card>
            <CardContent className="p-0">
              {filteredEntries.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Nenhuma entrada de tempo encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.startTime || entry.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: entry.task.color }}
                            />
                            {entry.task.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.startTime 
                            ? new Date(entry.startTime).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {entry.endTime 
                            ? new Date(entry.endTime).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : entry.isRunning ? 'Em andamento' : 'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {entry.duration ? formatDuration(entry.duration) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {entry.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditEntry(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          {/* Cabeçalho do Calendário */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h4 className="text-lg font-semibold">
                  {currentMonth.toLocaleDateString('pt-BR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h4>
                <Button variant="outline" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Grade do Calendário */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="p-2 text-center font-semibold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays().map((date, index) => {
                  if (!date) {
                    return <div key={index} className="p-2" />;
                  }

                  const dailyHours = getDailyHours(date);
                  const dailyHoursNumber = dailyHours / 3600; // Converter segundos para horas
                  const hasData = dailyHours > 0;
                  const isFullDay = dailyHoursNumber >= 8; // 8 horas ou mais

                  return (
                    <div
                      key={index}
                      className={`p-2 border rounded-lg text-center ${
                        isFullDay 
                          ? 'bg-green-50 border-green-300' 
                          : hasData 
                          ? 'bg-orange-50 border-orange-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="font-semibold">{date.getDate()}</div>
                      {hasData && (
                        <div className={`text-xs mt-1 ${
                          isFullDay ? 'text-green-600 font-medium' : 'text-orange-600'
                        }`}>
                          {formatDuration(dailyHours)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legenda do Calendário */}
          <Card>
            <CardContent className="p-4">
              <h5 className="font-semibold mb-3 text-gray-900">Legenda do Calendário</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
                  <span>8 horas ou mais trabalhadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
                  <span>Menos de 8 horas trabalhadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
                  <span>Nenhuma hora trabalhada</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Edição */}
      <Dialog open={!!editingEntry} onOpenChange={() => handleCancelEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entrada de Tempo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-task">Atividade</Label>
              <Select value={editTaskId?.toString() || ""} onValueChange={(value) => setEditTaskId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma atividade" />
                </SelectTrigger>
                <SelectContent>
                  {tasks?.map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-start-time">Hora de Início</Label>
              <Input
                id="edit-start-time"
                type="datetime-local"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-end-time">Hora de Fim</Label>
              <Input
                id="edit-end-time"
                type="datetime-local"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Observações</Label>
              <Input
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Adicione observações (opcional)"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateEntryMutation.isPending}>
                {updateEntryMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}