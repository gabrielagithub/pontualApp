import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/notification-toast";
import type { InsertTimeEntry, UpdateTimeEntry } from "@shared/schema";

export function useTimer() {
  const { toast } = useToast();

  const startTimerMutation = useMutation({
    mutationFn: async (taskId: number) => {
      try {
        // Verificar se já existe um timer ativo para esta tarefa
        const response = await fetch("/api/time-entries/running", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Falha ao verificar timers ativos");
        }
        const runningEntries = await response.json();
        const existingTimer = runningEntries.find((entry: any) => entry.taskId === taskId);
        
        if (existingTimer) {
          throw new Error("Já existe um timer ativo para esta atividade. Finalize ou pause o timer atual antes de iniciar outro.");
        }
        
        const timeEntry: InsertTimeEntry = {
          taskId,
          startTime: new Date(),
          endTime: null,
          duration: null,
          isRunning: true,
        };
        return apiRequest("POST", "/api/time-entries", timeEntry);
      } catch (error) {
        console.error("Timer start error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/running"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      showNotification({
        type: "success",
        title: "Timer iniciado",
        message: "Cronômetro iniciado para a atividade",
      });

      // Show browser notification
      if (Notification.permission === "granted") {
        new Notification("TimeTracker", {
          body: "Timer iniciado para atividade",
          icon: "/favicon.ico",
        });
      }
    },
    onError: (error: any) => {
      console.log("Error starting timer:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao iniciar timer",
        variant: "destructive",
      });
    },
  });

  const pauseTimerMutation = useMutation({
    mutationFn: async (entryId: number) => {
      // Get current entry to calculate accumulated duration
      const entry = await fetch(`/api/time-entries/${entryId}`, {
        credentials: "include",
      }).then(res => res.json());

      const now = new Date();
      const startTime = new Date(entry.start_time || entry.startTime);
      const currentSessionDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      // Add to existing duration (for resumed timers) or start fresh
      const accumulatedDuration = (entry.duration || 0) + currentSessionDuration;

      console.log("Pausando timer:", {
        entryId,
        startTime: entry.start_time || entry.startTime,
        currentSessionDuration,
        existingDuration: entry.duration,
        accumulatedDuration
      });

      // PAUSE: Pausar o timer definindo isRunning = false e endTime
      const updates: UpdateTimeEntry = {
        endTime: now,
        duration: accumulatedDuration, // Salvar duração acumulada ao pausar
        isRunning: false, // Definir como false para indicar que está pausado
      };

      return apiRequest("PUT", `/api/time-entries/${entryId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/running"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      showNotification({
        type: "info",
        title: "Timer pausado",
        message: "O apontamento de tempo foi pausado",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao pausar timer",
        variant: "destructive",
      });
    },
  });

  const resumeTimerMutation = useMutation({
    mutationFn: async (entryId: number) => {
      // Get current entry to preserve accumulated duration
      const entry = await fetch(`/api/time-entries/${entryId}`, {
        credentials: "include",
      }).then(res => res.json());

      console.log("Retomando timer:", {
        entryId,
        preservedDuration: entry.duration,
        wasRunning: entry.is_running || entry.isRunning
      });

      const updates: UpdateTimeEntry = {
        startTime: new Date(), // Reiniciar o startTime para medir corretamente a nova sessão
        endTime: null,
        isRunning: true,
        // NÃO resetar duration - ela deve ser preservada
      };

      return apiRequest("PUT", `/api/time-entries/${entryId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/running"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      showNotification({
        type: "success",
        title: "Timer retomado",
        message: "O apontamento de tempo foi retomado",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao retomar timer",
        variant: "destructive",
      });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (entryId: number) => {
      console.log("stopTimerMutation.mutationFn called with entryId:", entryId);
      // Get current entry to calculate duration
      const response = await fetch(`/api/time-entries/${entryId}`, {
        credentials: "include",
      });
      console.log("Fetch response:", response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch entry: ${response.status}`);
      }
      
      try {
        const entry = await response.json();
        console.log("Fetched entry:", entry);

        const now = new Date();
        let totalDuration = 0;

        console.log("Entry data:", {
          startTime: entry.start_time,
          endTime: entry.end_time,
          isRunning: entry.is_running
        });

        // Calcular duração apenas desta sessão
        if (entry.end_time) {
          // Sessão pausada: calcular até o momento da pausa
          const startTime = new Date(entry.start_time);
          const endTime = new Date(entry.end_time);
          totalDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          console.log("Pausado - duração até pause:", { startTime, endTime, totalDuration });
        } else {
          // Sessão rodando: calcular até agora
          const startTime = new Date(entry.start_time);
          totalDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          console.log("Rodando - duração atual:", { startTime, now, totalDuration });
        }

        // Validar tempo mínimo de 1 minuto (60 segundos) apenas no STOP final
        // No pause, permitir qualquer duração para preservar a sessão
        if (totalDuration < 60) {
          // Se o tempo for menor que 1 minuto, deletar a entrada em vez de salvar
          console.log("Sessão muito curta, deletando entrada:", entryId);
          const deleteResult = await apiRequest("DELETE", `/api/time-entries/${entryId}`);
          throw new Error("O tempo de trabalho deve ser de pelo menos 1 minuto para ser salvo. Sessão removida.");
        }

        const updates: UpdateTimeEntry = {
          endTime: now,
          duration: totalDuration,
          isRunning: false,
        };
        console.log("Calculated totalDuration:", totalDuration);
        console.log("Updates to send:", updates);

        const result = await apiRequest("PUT", `/api/time-entries/${entryId}`, updates);
        console.log("PUT request result:", result);
        return result;
      } catch (error) {
        console.error("Error in stopTimer mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/running"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      showNotification({
        type: "success",
        title: "Timer finalizado",
        message: "O apontamento foi salvo no histórico",
      });

      // Show browser notification
      if (Notification.permission === "granted") {
        new Notification("TimeTracker", {
          body: "Timer finalizado e salvo",
          icon: "/favicon.ico",
        });
      }
    },
    onError: (error: any) => {
      console.log("Error in stopTimer mutation:", error);
      
      // Verificar se é erro de tempo mínimo
      if (error.message && error.message.includes("pelo menos 1 minuto")) {
        // Invalidar queries para remover da lista de sessões ativas
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries/running"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        
        toast({
          title: "Sessão removida",
          description: "Tempo inferior a 1 minuto. A sessão foi removida automaticamente.",
          variant: "default",
        });
      } else {
        toast({
          title: "Erro",
          description: "Falha ao finalizar timer",
          variant: "destructive",
        });
      }
    },
  });

  const finishTimerMutation = useMutation({
    mutationFn: async (entryId: number) => {
      console.log("finishTimerMutation called for entryId:", entryId);
      
      // Para finalizar, primeiro precisamos parar o timer se estiver rodando
      // Depois marcamos com um endTime mais antigo para sair das sessões ativas
      const response = await fetch(`/api/time-entries/${entryId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch entry: ${response.status}`);
      }
      
      const entry = await response.json();
      console.log("Entry to finish:", entry);
      
      const now = new Date();
      let finalDuration = entry.duration || 0;
      
      // Se ainda estiver rodando, calcular tempo final
      if (entry.is_running) {
        const startTime = new Date(entry.start_time);
        const currentSessionDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        finalDuration = (entry.duration || 0) + currentSessionDuration;
      }
      
      // Para garantir que a sessão saia das "ativas", vamos mover o endTime para 6 horas atrás
      const finalizedTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      
      const updates: UpdateTimeEntry = {
        endTime: finalizedTime, // endTime mais antigo para sair das sessões ativas
        duration: finalDuration, // Duração final calculada
        isRunning: false, // Garantir que não está mais ativa
      };
      
      console.log("Finishing timer with updates:", updates);
      
      const result = await apiRequest("PUT", `/api/time-entries/${entryId}`, updates);
      console.log("Finish result:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/running"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      showNotification({
        type: "success",
        title: "Atividade finalizada",
        message: "A atividade foi finalizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao finalizar atividade",
        variant: "destructive",
      });
    },
  });

  const finishAndCompleteTimerMutation = useMutation({
    mutationFn: async ({ entryId, taskId }: { entryId: number; taskId: number }) => {
      try {
        console.log("finishAndCompleteTimerMutation called", { entryId, taskId });
        
        // Primeiro finalizar o timer
        const response = await fetch(`/api/time-entries/${entryId}`, {
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch entry: ${response.status}`);
        }
        
        const entry = await response.json();
        console.log("Entry to finish and complete:", entry);
        
        const now = new Date();
        let finalDuration = entry.duration || 0;
        
        // Se ainda estiver rodando, calcular tempo final
        if (entry.is_running || entry.isRunning) {
          const startTime = new Date(entry.start_time || entry.startTime);
          const currentSessionDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          finalDuration = (entry.duration || 0) + currentSessionDuration;
        }
        
        // Validar tempo mínimo de 1 minuto - mas permitir finalização para conclusão de tarefa
        if (finalDuration < 60) {
          // Para a função "Finalizar e Concluir", vamos permitir mesmo com menos de 1 minuto
          // Mas vamos finalizar com duração mínima e depois concluir a tarefa
          finalDuration = 60; // Setar duração mínima para permitir a conclusão
        }
        
        // Finalizar o timer
        const finalizedTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        const timeUpdates: UpdateTimeEntry = {
          endTime: finalizedTime,
          duration: finalDuration,
          isRunning: false,
        };
        
        console.log("Finalizing timer with updates:", timeUpdates);
        const timeResult = await apiRequest("PUT", `/api/time-entries/${entryId}`, timeUpdates);
        console.log("Timer finalized:", timeResult);
        
        // Concluir a tarefa
        console.log("Completing task:", taskId);
        const taskResult = await apiRequest("PUT", `/api/tasks/${taskId}/complete`);
        console.log("Task completed:", taskResult);
        
        return { timeEntry: timeUpdates, taskId };
      } catch (error) {
        console.error("Error in finishAndCompleteTimerMutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/running"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      showNotification({
        type: "success",
        title: "Atividade finalizada e concluída",
        message: "O timer foi finalizado e a atividade foi marcada como concluída",
      });
    },
    onError: (error: any) => {
      if (error.message && error.message.includes("pelo menos 1 minuto")) {
        toast({
          title: "Sessão removida",
          description: "Tempo inferior a 1 minuto. A sessão foi removida automaticamente.",
          variant: "default",
        });
      } else {
        toast({
          title: "Erro",
          description: "Falha ao finalizar e concluir atividade",
          variant: "destructive",
        });
      }
    },
  });

  return {
    startTimer: startTimerMutation.mutate,
    pauseTimer: pauseTimerMutation.mutate,
    resumeTimer: resumeTimerMutation.mutate,
    stopTimer: stopTimerMutation.mutate,
    finishTimer: finishTimerMutation.mutate,
    finishAndCompleteTimer: finishAndCompleteTimerMutation.mutate,
    isLoading: startTimerMutation.isPending || pauseTimerMutation.isPending || resumeTimerMutation.isPending || stopTimerMutation.isPending || finishTimerMutation.isPending || finishAndCompleteTimerMutation.isPending,
  };
}