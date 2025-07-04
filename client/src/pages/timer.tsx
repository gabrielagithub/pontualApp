import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play, Pause, Square, Clock, Plus, AlertTriangle } from "lucide-react";
import TimerDisplay from "@/components/timer-display";
import QuickTaskForm from "@/components/quick-task-form";
import { useTimer } from "@/hooks/use-timer";
import { formatDuration } from "@/lib/timer-utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TaskWithStats, TimeEntryWithTask, InsertTimeEntry } from "@shared/schema";

export default function Timer() {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualTaskId, setManualTaskId] = useState<number | null>(null);
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualStartTime, setManualStartTime] = useState("09:00");
  const [manualNotes, setManualNotes] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  
  const { toast } = useToast();

  const { data: tasks, isLoading: tasksLoading } = useQuery<TaskWithStats[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: runningEntries, isLoading: runningLoading, error: runningError } = useQuery<TimeEntryWithTask[]>({
    queryKey: ["/api/time-entries/running"],
    refetchInterval: 5000, // 5 segundos
    retryDelay: 10000, // 10 segundos entre tentativas
  });

  const { startTimer, pauseTimer, resumeTimer, stopTimer, finishTimer, finishAndCompleteTimer, isLoading: timerLoading } = useTimer();

  const addManualEntryMutation = useMutation({
    mutationFn: (data: InsertTimeEntry) => apiRequest("POST", "/api/time-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Tempo adicionado",
        description: "O tempo foi adicionado com sucesso à atividade.",
      });
      setManualEntryOpen(false);
      setManualHours("");
      setManualMinutes("");
      setManualStartTime("09:00");
      setManualNotes("");
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualTaskId(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o tempo.",
        variant: "destructive",
      });
    },
  });

  const handleManualEntry = () => {
    if (!manualTaskId || (!manualHours && !manualMinutes)) {
      toast({
        title: "Erro",
        description: "Selecione uma atividade e informe o tempo.",
        variant: "destructive",
      });
      return;
    }

    const durationHours = parseInt(manualHours) || 0;
    const durationMinutes = parseInt(manualMinutes) || 0;
    const totalMinutes = durationHours * 60 + durationMinutes;
    
    if (totalMinutes <= 0) {
      toast({
        title: "Erro",
        description: "O tempo deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    // Calcular horário de início usando a hora informada pelo usuário
    const [startHours, startMinutes] = manualStartTime.split(':').map(Number);
    const selectedDate = new Date(manualDate + 'T00:00:00-03:00');
    
    const startTime = new Date(selectedDate);
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);

    const entry: InsertTimeEntry = {
      taskId: manualTaskId,
      startTime: startTime,
      endTime: endTime,
      duration: totalMinutes * 60,
      isRunning: false,
      notes: manualNotes || null,
    };

    addManualEntryMutation.mutate(entry);
  };

  const handleStartTimer = () => {
    if (selectedTaskId) {
      startTimer(selectedTaskId);
    }
  };

  if (tasksLoading || runningLoading) {
    return (
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Controle de Tempo</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-20 bg-gray-200 rounded" />
                <div className="h-12 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentTime = 0; // This would be tracked in a timer state

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Controle de Tempo</h3>
      
      {/* Status de conectividade */}
      {runningError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              Conectividade temporariamente indisponível. O sistema tentará reconectar automaticamente.
            </span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Controle Automático
              <Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Tempo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Tempo Manual</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="manual-task">Atividade</Label>
                      <Select value={manualTaskId?.toString() || ""} onValueChange={(value) => setManualTaskId(parseInt(value))}>
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
                      <Label htmlFor="manual-start-time">Hora de Início</Label>
                      <Input
                        id="manual-start-time"
                        type="time"
                        value={manualStartTime}
                        onChange={(e) => setManualStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="manual-date">Data do Apontamento</Label>
                      <Input
                        id="manual-date"
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="manual-hours">Horas</Label>
                        <Input
                          id="manual-hours"
                          type="number"
                          min="0"
                          max="23"
                          value={manualHours}
                          onChange={(e) => setManualHours(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="manual-minutes">Minutos</Label>
                        <Input
                          id="manual-minutes"
                          type="number"
                          min="0"
                          max="59"
                          value={manualMinutes}
                          onChange={(e) => setManualMinutes(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="manual-notes">Observações (opcional)</Label>
                      <Input
                        id="manual-notes"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        placeholder="Descreva o que foi feito"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setManualEntryOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleManualEntry}
                        disabled={addManualEntryMutation.isPending}
                      >
                        {addManualEntryMutation.isPending ? "Adicionando..." : "Adicionar Tempo"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            
            {/* Task Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Atividade
              </label>
              <Select 
                value={selectedTaskId?.toString() || ""} 
                onValueChange={(value) => setSelectedTaskId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma atividade" />
                </SelectTrigger>
                <SelectContent>
                  {tasks?.filter(task => !task.isCompleted).map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: task.color }}
                        />
                        {task.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timer Display */}
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-gray-900 mb-2">
                {formatDuration(currentTime, false)}
              </div>
              <p className="text-sm text-gray-600">Tempo decorrido</p>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center space-x-4">
              <Button
                onClick={handleStartTimer}
                disabled={!selectedTaskId || timerLoading}
                className="bg-secondary hover:bg-secondary/90"
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciar
              </Button>

              <Button
                variant="destructive"
                disabled={!runningEntries?.length || timerLoading}
                onClick={() => {
                  console.log("Finalizar clicked, runningEntries:", runningEntries);
                  if (runningEntries?.[0]) {
                    console.log("Calling stopTimer with ID:", runningEntries[0].id);
                    stopTimer(runningEntries[0].id);
                  }
                }}
              >
                <Square className="mr-2 h-4 w-4" />
                Finalizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Sessões Ativas</h4>
            
            {runningEntries && runningEntries.length > 0 ? (
              <div className="space-y-3">
                {runningEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                  >
                    <div>
                      <h5 className="font-medium text-gray-900">{entry.task.name}</h5>
                      <p className="text-sm text-gray-600">
                        Iniciado às {new Date(entry.startTime).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <TimerDisplay 
                        startTime={entry.startTime}
                        endTime={entry.endTime}
                        duration={entry.duration}
                        isRunning={entry.isRunning}
                        className="text-lg font-bold text-primary"
                      />
                      <div className="text-xs text-gray-500">
                        {entry.isRunning ? "Em andamento" : "Pausado"}
                      </div>
                      <div className="flex space-x-1 mt-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => entry.isRunning ? pauseTimer(entry.id) : resumeTimer(entry.id)}
                          disabled={timerLoading}
                          className="bg-[#FFA500] hover:bg-[#FF8C00] text-white"
                        >
                          {entry.isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => entry.isRunning ? stopTimer(entry.id) : finishTimer(entry.id)}
                          disabled={timerLoading}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => finishAndCompleteTimer({ entryId: entry.id, taskId: entry.taskId })}
                          disabled={timerLoading}
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          title="Finalizar timer e marcar atividade como concluída"
                        >
                          ✓
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma sessão ativa</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
