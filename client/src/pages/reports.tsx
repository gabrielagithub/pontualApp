import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Calendar } from "lucide-react";
import { formatDuration } from "@/lib/timer-utils";
import { exportToCSV } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@shared/schema";

interface TimeByTaskData {
  task: Task;
  totalTime: number;
}

interface DailyStatsData {
  date: string;
  totalTime: number;
}

export default function Reports() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Função para gerar data no formato brasileiro (UTC-3)
  const getBrazilianDateString = (date: Date) => {
    const brazilDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    return brazilDate.toISOString().split('T')[0];
  };

  // Date filter state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return getBrazilianDateString(date);
  });
  
  const [endDate, setEndDate] = useState(() => {
    return getBrazilianDateString(new Date());
  });

  const { data: weeklyData, isLoading: weeklyLoading } = useQuery<TimeByTaskData[]>({
    queryKey: ["/api/reports/time-by-task", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/reports/time-by-task?${params}`);
      if (!response.ok) throw new Error('Failed to fetch time by task data');
      return response.json();
    }
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery<DailyStatsData[]>({
    queryKey: ["/api/reports/daily-stats", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/reports/daily-stats?${params}`);
      if (!response.ok) throw new Error('Failed to fetch daily stats data');
      return response.json();
    }
  });

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/export/csv?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio-pontual.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Sucesso",
        description: "Dados exportados em CSV com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao exportar dados em CSV",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      // Abrir o relatório em uma nova aba com filtros de data
      const params = new URLSearchParams({ startDate, endDate });
      const newWindow = window.open(`/api/export/pdf?${params}`, "_blank");
      
      if (!newWindow) {
        throw new Error("Popup bloqueado");
      }

      toast({
        title: "Sucesso",
        description: "Relatório aberto em nova aba. Use Ctrl+P para imprimir ou salvar como PDF",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao abrir relatório. Verifique se popups estão habilitados",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (weeklyLoading || dailyLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Relatórios</h3>
          <div className="flex space-x-3">
            <Button disabled>
              <FileText className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalWeekTime = weeklyData?.reduce((sum, item) => sum + item.totalTime, 0) || 0;
  const maxTaskTime = Math.max(...(weeklyData?.map(item => item.totalTime) || [1]));

  // Calculate daily stats - ajustar para horário brasileiro
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const dailyStatsWithNames = dailyData?.map(day => {
    // Ajustar data para horário brasileiro (UTC-3)
    const brazilDate = new Date(day.date + 'T12:00:00-03:00');
    return {
      ...day,
      dayName: dayNames[brazilDate.getDay()],
    };
  }) || [];

  const totalDailyTime = dailyStatsWithNames.reduce((sum, day) => sum + day.totalTime, 0);
  const averageDailyTime = dailyStatsWithNames.length > 0 ? totalDailyTime / dailyStatsWithNames.length : 0;
  const maxSessionTime = Math.max(...(dailyStatsWithNames.map(day => day.totalTime)), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Relatórios</h3>
        <div className="flex space-x-3">
          <Button
            onClick={handleExportCSV}
            disabled={isExporting}
            variant="outline"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar CSV"}
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExporting ? "Gerando..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900">Filtro de Período</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                Data de Início
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                Data Final
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  const weekStart = new Date();
                  weekStart.setDate(weekStart.getDate() - 7);
                  setStartDate(getBrazilianDateString(weekStart));
                  setEndDate(getBrazilianDateString(new Date()));
                }}
                variant="outline"
                className="w-full"
              >
                Última Semana
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <Button
              onClick={() => {
                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                setStartDate(getBrazilianDateString(monthStart));
                setEndDate(getBrazilianDateString(new Date()));
              }}
              variant="outline"
              size="sm"
            >
              Este Mês
            </Button>
            <Button
              onClick={() => {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                lastMonth.setDate(1);
                const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
                setStartDate(getBrazilianDateString(lastMonth));
                setEndDate(getBrazilianDateString(lastMonthEnd));
              }}
              variant="outline"
              size="sm"
            >
              Mês Anterior
            </Button>
            <Button
              onClick={() => {
                const today = new Date();
                setStartDate(getBrazilianDateString(today));
                setEndDate(getBrazilianDateString(today));
              }}
              variant="outline"
              size="sm"
            >
              Hoje
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time by Activity */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            Tempo por Atividade
          </h4>
          
          {weeklyData && weeklyData.length > 0 ? (
            <div className="space-y-4">
              {weeklyData.map((item) => {
                const percentage = maxTaskTime > 0 ? (item.totalTime / maxTaskTime) * 100 : 0;
                return (
                  <div key={item.task.id} className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div 
                        className="w-4 h-4 rounded-full mr-3" 
                        style={{ backgroundColor: item.task.color }}
                      />
                      <span className="font-medium text-gray-900 flex-1">
                        {item.task.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 flex-1 max-w-md">
                      <Progress value={percentage} className="flex-1" />
                      <span className="text-sm font-medium text-gray-900 w-16 text-right">
                        {formatDuration(item.totalTime)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum dado de tempo registrado esta semana</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Summary and Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Resumo Diário</h4>
            
            {dailyStatsWithNames.length > 0 ? (
              <div className="space-y-3">
                {dailyStatsWithNames.map((day) => (
                  <div key={day.date} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{day.dayName}</span>
                    <span className="font-medium text-gray-900">
                      {formatDuration(day.totalTime)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum dado diário disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Métricas</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Média diária</span>
                <span className="font-medium text-gray-900">
                  {formatDuration(averageDailyTime)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total da semana</span>
                <span className="font-medium text-gray-900">
                  {formatDuration(totalWeekTime)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Maior sessão</span>
                <span className="font-medium text-gray-900">
                  {formatDuration(maxSessionTime)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Atividades distintas</span>
                <span className="font-medium text-gray-900">
                  {weeklyData?.length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
