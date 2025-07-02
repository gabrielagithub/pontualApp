import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, MessageSquare, Settings, Activity, Clock, Calendar, Bell } from "lucide-react";

const integrationSchema = z.object({
  userId: z.number().default(1),
  instanceName: z.string().min(1, "Nome da instância é obrigatório"),
  apiUrl: z.string().url("URL deve ser válida"),
  apiKey: z.string().min(1, "API Key é obrigatória"),
  phoneNumber: z.string().min(10, "Número deve ter pelo menos 10 dígitos"),
  webhookUrl: z.string().url("URL do webhook deve ser válida").optional(),
});

const notificationSchema = z.object({
  userId: z.number().default(1),
  enableDailyReport: z.boolean(),
  dailyReportTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato deve ser HH:MM"),
  enableWeeklyReport: z.boolean(),
  weeklyReportDay: z.number().min(0).max(6),
  enableDeadlineReminders: z.boolean(),
  reminderHoursBefore: z.number().min(1).max(168),
  enableTimerReminders: z.boolean(),
  timerReminderInterval: z.number().min(5).max(480),
});

export default function WhatsAppPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("integration");

  // Integration form
  const integrationForm = useForm({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      userId: 1,
      instanceName: "",
      apiUrl: "",
      apiKey: "",
      phoneNumber: "",
      webhookUrl: `${window.location.origin}/api/whatsapp/webhook/`,
    },
  });

  // Notification form
  const notificationForm = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      userId: 1,
      enableDailyReport: false,
      dailyReportTime: "18:00",
      enableWeeklyReport: false,
      weeklyReportDay: 5,
      enableDeadlineReminders: true,
      reminderHoursBefore: 24,
      enableTimerReminders: false,
      timerReminderInterval: 120,
    },
  });

  // Queries
  const { data: integration, isLoading: integrationLoading } = useQuery({
    queryKey: ["/api/whatsapp/integration/1"],
    retry: false,
  });

  const { data: notificationSettings, isLoading: notificationLoading } = useQuery({
    queryKey: ["/api/notifications/settings/1"],
    retry: false,
  });

  const { data: logs } = useQuery({
    queryKey: integration ? ["/api/whatsapp/logs", integration.id] : null,
    enabled: !!integration,
  });

  // Mutations
  const createIntegrationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/whatsapp/integration", data),
    onSuccess: () => {
      toast({ title: "Integração WhatsApp criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/integration/1"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar integração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("PUT", `/api/whatsapp/integration/${integration.id}`, data),
    onSuccess: () => {
      toast({ title: "Integração WhatsApp atualizada!" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/integration/1"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar integração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/notifications/settings", data),
    onSuccess: () => {
      toast({ title: "Configurações de notificação criadas!" });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/settings/1"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("PUT", `/api/notifications/settings/1`, data),
    onSuccess: () => {
      toast({ title: "Configurações de notificação atualizadas!" });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/settings/1"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load existing data into forms
  useEffect(() => {
    if (integration) {
      integrationForm.reset({
        userId: integration.userId,
        instanceName: integration.instanceName,
        apiUrl: integration.apiUrl,
        apiKey: "", // Não carregamos a API key por segurança
        phoneNumber: integration.phoneNumber,
        webhookUrl: integration.webhookUrl || `${window.location.origin}/api/whatsapp/webhook/${integration.instanceName}`,
      });
    }
  }, [integration, integrationForm]);

  useEffect(() => {
    if (notificationSettings) {
      notificationForm.reset(notificationSettings);
    }
  }, [notificationSettings, notificationForm]);

  const onSubmitIntegration = (data: any) => {
    if (integration) {
      updateIntegrationMutation.mutate(data);
    } else {
      createIntegrationMutation.mutate(data);
    }
  };

  const onSubmitNotifications = (data: any) => {
    if (notificationSettings) {
      updateNotificationMutation.mutate(data);
    } else {
      createNotificationMutation.mutate(data);
    }
  };

  const weekDays = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-green-600" />
            Integração WhatsApp
          </h1>
          <p className="text-gray-600 mt-2">
            Configure a integração com Evolution API para controlar suas tarefas via WhatsApp
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="integration">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="commands">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comandos
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="h-4 w-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integration">
            <Card>
              <CardHeader>
                <CardTitle>Configuração da Evolution API</CardTitle>
                <CardDescription>
                  Configure os dados de conexão com sua instância Evolution API
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...integrationForm}>
                  <form onSubmit={integrationForm.handleSubmit(onSubmitIntegration)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={integrationForm.control}
                        name="instanceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Instância</FormLabel>
                            <FormControl>
                              <Input placeholder="minha-instancia" {...field} />
                            </FormControl>
                            <FormDescription>
                              Nome da instância na Evolution API
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={integrationForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número do WhatsApp</FormLabel>
                            <FormControl>
                              <Input placeholder="5511999999999" {...field} />
                            </FormControl>
                            <FormDescription>
                              Número conectado no WhatsApp (apenas números)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={integrationForm.control}
                      name="apiUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL da Evolution API</FormLabel>
                          <FormControl>
                            <Input placeholder="https://api.evolution.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            URL base da sua Evolution API
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={integrationForm.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="sua-api-key" {...field} />
                          </FormControl>
                          <FormDescription>
                            Chave de API da Evolution API
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={integrationForm.control}
                      name="webhookUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Webhook</FormLabel>
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                          <FormDescription>
                            Configure esta URL na sua Evolution API para receber mensagens
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3">
                      <Button 
                        type="submit" 
                        disabled={createIntegrationMutation.isPending || updateIntegrationMutation.isPending}
                      >
                        {integration ? "Atualizar Integração" : "Criar Integração"}
                      </Button>
                      
                      {integration && (
                        <Badge variant={integration.isActive ? "default" : "secondary"}>
                          {integration.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Notificação</CardTitle>
                <CardDescription>
                  Configure notificações automáticas via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onSubmitNotifications)} className="space-y-6">
                    
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Relatórios Automáticos
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <FormField
                            control={notificationForm.control}
                            name="enableDailyReport"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Relatório Diário</FormLabel>
                                  <FormDescription>
                                    Receber relatório diário automaticamente
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {notificationForm.watch("enableDailyReport") && (
                            <FormField
                              control={notificationForm.control}
                              name="dailyReportTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Horário do Relatório</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        <div className="space-y-3">
                          <FormField
                            control={notificationForm.control}
                            name="enableWeeklyReport"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Relatório Semanal</FormLabel>
                                  <FormDescription>
                                    Receber relatório semanal automaticamente
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {notificationForm.watch("enableWeeklyReport") && (
                            <FormField
                              control={notificationForm.control}
                              name="weeklyReportDay"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Dia da Semana</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o dia" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {weekDays.map((day) => (
                                        <SelectItem key={day.value} value={day.value.toString()}>
                                          {day.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Lembretes
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <FormField
                            control={notificationForm.control}
                            name="enableDeadlineReminders"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Lembretes de Prazo</FormLabel>
                                  <FormDescription>
                                    Avisar sobre tarefas próximas do prazo
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {notificationForm.watch("enableDeadlineReminders") && (
                            <FormField
                              control={notificationForm.control}
                              name="reminderHoursBefore"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Horas Antes</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      max="168" 
                                      {...field}
                                      onChange={e => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Quantas horas antes do prazo avisar
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        <div className="space-y-3">
                          <FormField
                            control={notificationForm.control}
                            name="enableTimerReminders"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Lembretes de Timer</FormLabel>
                                  <FormDescription>
                                    Avisar sobre timers ativos há muito tempo
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {notificationForm.watch("enableTimerReminders") && (
                            <FormField
                              control={notificationForm.control}
                              name="timerReminderInterval"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Intervalo (minutos)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="5" 
                                      max="480" 
                                      {...field}
                                      onChange={e => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    A cada quantos minutos avisar sobre timer ativo
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={createNotificationMutation.isPending || updateNotificationMutation.isPending}
                    >
                      {notificationSettings ? "Atualizar Configurações" : "Criar Configurações"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commands">
            <Card>
              <CardHeader>
                <CardTitle>Comandos Disponíveis</CardTitle>
                <CardDescription>
                  Lista completa de comandos que você pode usar no WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div>
                  <h4 className="font-medium mb-3 text-green-700">📋 Gestão de Tarefas</h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">tarefas</code>
                        <p className="text-sm text-gray-600 mt-1">Listar todas as tarefas</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">nova [nome da tarefa]</code>
                        <p className="text-sm text-gray-600 mt-1">Criar nova tarefa</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-blue-700">⏱️ Controle de Tempo</h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">iniciar [tarefa]</code>
                        <p className="text-sm text-gray-600 mt-1">Iniciar timer para uma tarefa</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">parar [tarefa]</code>
                        <p className="text-sm text-gray-600 mt-1">Parar timer ativo</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-purple-700">📝 Lançamentos</h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">lancamento [tarefa] [tempo]</code>
                        <p className="text-sm text-gray-600 mt-1">Lançar horas manualmente (ex: lancamento 1 2h)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-orange-700">📊 Relatórios</h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">relatorio</code>
                        <p className="text-sm text-gray-600 mt-1">Relatório de hoje</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">status</code>
                        <p className="text-sm text-gray-600 mt-1">Status atual dos timers</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-gray-700">❓ Ajuda</h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">ajuda</code>
                        <p className="text-sm text-gray-600 mt-1">Mostrar lista completa de comandos</p>
                      </div>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Atividade</CardTitle>
                <CardDescription>
                  Histórico de mensagens e comandos processados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!integration ? (
                  <p className="text-gray-500 text-center py-8">
                    Configure a integração WhatsApp primeiro para ver os logs
                  </p>
                ) : logs && logs.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {logs.map((log: any) => (
                      <div key={log.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant={log.success ? "default" : "destructive"}>
                            {log.success ? "Sucesso" : "Erro"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm">
                            <strong>Mensagem:</strong> {log.messageContent}
                          </p>
                          {log.command && (
                            <p className="text-sm">
                              <strong>Comando:</strong> {log.command}
                            </p>
                          )}
                          <p className="text-sm">
                            <strong>Resposta:</strong> {log.response}
                          </p>
                          {log.errorMessage && (
                            <p className="text-sm text-red-600">
                              <strong>Erro:</strong> {log.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum log encontrado ainda
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}