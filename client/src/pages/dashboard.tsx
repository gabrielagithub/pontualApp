import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ListTodo, Calendar, Trophy, Play, Pause, Square, AlertTriangle, Timer, CalendarCheck, CalendarClock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import TimerDisplay from "@/components/timer-display";
import TaskDetailsModal from "@/components/task-details-modal";
import { useTimer } from "@/hooks/use-timer";
import { formatDuration, formatDurationForDashboard } from "@/lib/timer-utils";
import { apiRequest } from "@/lib/queryClient";
import type { TaskWithStats, TimeEntryWithTask } from "@shared/schema";
import { useState } from "react";

interface DashboardStats {
  todayTime: number;
  activeTasks: number;
  weekTime: number;
  monthTime: number;
  completedTasks: number;
  overdueTasks: number;
  overTimeTasks: number;
  dueTodayTasks: number;
  dueTomorrowTasks: number;
  nearingLimitTasks: number;
}

export default function Dashboard() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "overdue" | "overtime" | "dueToday" | "dueTomorrow" | "nearingLimit" | null;
    title: string;
    tasks: any[];
  }>({
    isOpen: false,
    type: null,
    title: "",
    tasks: []
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: runningEntries, isLoading: runningLoading } = useQuery<TimeEntryWithTask[]>({
    queryKey: ["/api/time-entries/running"],
    refetchInterval: 5000, // Update every 5 seconds
  });

  const { data: timeEntries, isLoading: entriesLoading } = useQuery<TimeEntryWithTask[]>({
    queryKey: ["/api/time-entries"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<TaskWithStats[]>({
    queryKey: ["/api/tasks"],
  });

  const { pauseTimer, stopTimer } = useTimer();

  const handleCardClick = async (type: "overdue" | "overtime" | "dueToday" | "dueTomorrow" | "nearingLimit") => {
    try {
      let endpoint = "";
      let title = "";
      
      switch (type) {
        case "overdue":
          endpoint = "/api/dashboard/overdue-tasks";
          title = "Tarefas com Prazo Excedido";
          break;
        case "overtime":
          endpoint = "/api/dashboard/overtime-tasks";
          title = "Tarefas com Horas Excedidas";
          break;
        case "dueToday":
          endpoint = "/api/dashboard/due-today-tasks";
          title = "Tarefas que Vencem Hoje";
          break;
        case "dueTomorrow":
          endpoint = "/api/dashboard/due-tomorrow-tasks";
          title = "Tarefas que Vencem Amanhã";
          break;
        case "nearingLimit":
          endpoint = "/api/dashboard/nearing-limit-tasks";
          title = "Tarefas com 80% do Tempo Utilizado";
          break;
      }

      const response = await apiRequest("GET", endpoint);
      console.log(`Dados recebidos para ${type}:`, response);
      setModalState({
        isOpen: true,
        type,
        title,
        tasks: Array.isArray(response) ? response : []
      });
    } catch (error) {
      console.error("Erro ao buscar detalhes das tarefas:", error);
    }
  };

  if (statsLoading || runningLoading || entriesLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentRunningEntry = runningEntries?.[0];
  const recentEntries = timeEntries?.slice(0, 3) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary/10">
                <Clock className="text-primary text-xl h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tempo Hoje</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDurationForDashboard(stats?.todayTime || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-secondary/10">
                <ListTodo className="text-secondary text-xl h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tarefas Ativas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.activeTasks || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent/10">
                <Calendar className="text-accent text-xl h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Esta Semana</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDurationForDashboard(stats?.weekTime || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent/10">
                <Calendar className="text-accent text-xl h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Este Mês</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDurationForDashboard(stats?.monthTime || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border cursor-pointer hover:shadow-md transition-shadow ${stats?.overdueTasks && stats.overdueTasks > 0 ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
          onClick={() => handleCardClick("overdue")}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stats?.overdueTasks && stats.overdueTasks > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`text-xl h-6 w-6 ${stats?.overdueTasks && stats.overdueTasks > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Prazo Excedido</p>
                <p className={`text-2xl font-bold ${stats?.overdueTasks && stats.overdueTasks > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                  {stats?.overdueTasks || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border cursor-pointer hover:shadow-md transition-shadow ${stats?.overTimeTasks && stats.overTimeTasks > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-100'}`}
          onClick={() => handleCardClick("overtime")}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stats?.overTimeTasks && stats.overTimeTasks > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <Timer className={`text-xl h-6 w-6 ${stats?.overTimeTasks && stats.overTimeTasks > 0 ? 'text-orange-600' : 'text-gray-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Horas Excedidas</p>
                <p className={`text-2xl font-bold ${stats?.overTimeTasks && stats.overTimeTasks > 0 ? 'text-orange-700' : 'text-gray-900'}`}>
                  {stats?.overTimeTasks || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border cursor-pointer hover:shadow-md transition-shadow ${stats?.dueTodayTasks && stats.dueTodayTasks > 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-100'}`}
          onClick={() => handleCardClick("dueToday")}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stats?.dueTodayTasks && stats.dueTodayTasks > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <CalendarCheck className={`text-xl h-6 w-6 ${stats?.dueTodayTasks && stats.dueTodayTasks > 0 ? 'text-blue-600' : 'text-gray-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vence Hoje</p>
                <p className={`text-2xl font-bold ${stats?.dueTodayTasks && stats.dueTodayTasks > 0 ? 'text-blue-700' : 'text-gray-900'}`}>
                  {stats?.dueTodayTasks || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border cursor-pointer hover:shadow-md transition-shadow ${stats?.dueTomorrowTasks && stats.dueTomorrowTasks > 0 ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100'}`}
          onClick={() => handleCardClick("dueTomorrow")}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stats?.dueTomorrowTasks && stats.dueTomorrowTasks > 0 ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                <CalendarClock className={`text-xl h-6 w-6 ${stats?.dueTomorrowTasks && stats.dueTomorrowTasks > 0 ? 'text-indigo-600' : 'text-gray-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vence Amanhã</p>
                <p className={`text-2xl font-bold ${stats?.dueTomorrowTasks && stats.dueTomorrowTasks > 0 ? 'text-indigo-700' : 'text-gray-900'}`}>
                  {stats?.dueTomorrowTasks || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border cursor-pointer hover:shadow-md transition-shadow ${stats?.nearingLimitTasks && stats.nearingLimitTasks > 0 ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100'}`}
          onClick={() => handleCardClick("nearingLimit")}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stats?.nearingLimitTasks && stats.nearingLimitTasks > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                <TrendingUp className={`text-xl h-6 w-6 ${stats?.nearingLimitTasks && stats.nearingLimitTasks > 0 ? 'text-yellow-600' : 'text-gray-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">70-85% do Tempo</p>
                <p className={`text-2xl font-bold ${stats?.nearingLimitTasks && stats.nearingLimitTasks > 0 ? 'text-yellow-700' : 'text-gray-900'}`}>
                  {stats?.nearingLimitTasks || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card className="border border-gray-100">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Apontamentos Recentes</h3>
          
          {recentEntries.length > 0 ? (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3" 
                      style={{ backgroundColor: entry.task.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {entry.task.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {entry.duration ? formatDuration(entry.duration) : 'Em andamento'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum apontamento recente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes das tarefas */}
      <TaskDetailsModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        tasks={modalState.tasks}
        type={modalState.type!}
      />
    </div>
  );
}
