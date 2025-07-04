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
  instanceName: z.string().min(1, "Nome da instância é obrigatório"),
  apiUrl: z.string().url("URL deve ser válida"),
  apiKey: z.string().optional(), // Tornando opcional para permitir manter chave existente
  phoneNumber: z.string().min(10, "Número deve ter pelo menos 10 dígitos"),
  webhookUrl: z.string().url("URL do webhook deve ser válida").optional(),
  authorizedNumbers: z.string().optional(),
  responseMode: z.string().default("individual"),
  allowedGroupJid: z.string().optional(),
});

const notificationSchema = z.object({
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
      instanceName: "",
      apiUrl: "",
      apiKey: "",
      phoneNumber: "",
      webhookUrl: `${window.location.origin}/api/whatsapp/webhook/`,
      authorizedNumbers: "",
      responseMode: "individual",
      allowedGroupJid: "",
    },
  });

  // Notification form
  const notificationForm = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
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
  const { data: integration, isLoading: integrationLoading } = useQuery<any>({
    queryKey: ["/api/whatsapp/integration"],
    retry: false,
  });

  const { data: notificationSettings, isLoading: notificationLoading } = useQuery<any>({
    queryKey: ["/api/notifications/settings"],
    retry: false,
  });

  const { data: logs } = useQuery<any[]>({
    queryKey: ["/api/whatsapp/logs"],
    enabled: !!integration,
  });

  // Mutations
  const createIntegrationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/whatsapp/integration", data),
    onSuccess: () => {
      toast({ title: "Integração WhatsApp criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/integration"] });
    },
    onError: (error: any) => {
      console.error("❌ Erro detalhado na criação:", error);
      
      let errorMessage = error.message || "Erro desconhecido";
      
      // Se for erro de validação Zod, mostrar detalhes
      if (error.details && Array.isArray(error.details)) {
        errorMessage = error.details.join(", ");
      }
      
      toast({
        title: "Erro ao criar integração",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("PUT", `/api/whatsapp/integration/${integration.id}`, data),
    onSuccess: () => {
      toast({ title: "Integração WhatsApp atualizada!" });
      console.log("🔄 Invalidando cache após atualização...");
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/integration"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/logs"] });
      // Também forçar refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/whatsapp/integration"] });
      }, 100);
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
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/settings"] });
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
      apiRequest("PUT", `/api/notifications/settings`, data),
    onSuccess: () => {
      toast({ title: "Configurações de notificação atualizadas!" });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/settings"] });
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
      console.log("🔄 Carregando dados no formulário:", integration);
      integrationForm.reset({
        instanceName: integration.instanceName || "",
        apiUrl: integration.apiUrl || "",
        apiKey: integration.hasApiKey ? "••••••••••••••••" : "", // Mostrar placeholder se já tem chave salva
        phoneNumber: integration.phoneNumber || "",
        webhookUrl: `${window.location.origin}/api/whatsapp/webhook/${integration.instanceName}`,
        authorizedNumbers: integration.authorizedNumbers || "",
        responseMode: integration.responseMode || "individual",
        allowedGroupJid: integration.allowedGroupJid || "",
      });
    }
  }, [integration, integrationForm]);

  useEffect(() => {
    if (notificationSettings) {
      notificationForm.reset(notificationSettings);
    }
  }, [notificationSettings, notificationForm]);

  // Update webhook URL when instance name changes
  useEffect(() => {
    const instanceName = integrationForm.watch("instanceName");
    if (instanceName) {
      integrationForm.setValue("webhookUrl", `${window.location.origin}/api/whatsapp/webhook/${instanceName}`);
    }
  }, [integrationForm.watch("instanceName"), integrationForm]);

  const onSubmitIntegration = (data: any) => {
    console.log("🔄 Enviando dados do formulário:", data);
    
    // Validar API Key apenas se for nova integração ou se foi preenchida
    if (!integration && (!data.apiKey || data.apiKey.trim() === '')) {
      toast({
        title: "API Key obrigatória",
        description: "API Key é obrigatória para criar nova integração",
        variant: "destructive",
      });
      return;
    }

    // Validar formato dos números autorizados se preenchido
    if (data.authorizedNumbers && data.authorizedNumbers.trim()) {
      try {
        const numbers = JSON.parse(data.authorizedNumbers);
        if (!Array.isArray(numbers)) {
          throw new Error("Deve ser um array");
        }
        if (!numbers.every(n => typeof n === 'string' && n.includes('@c.us'))) {
          throw new Error("Todos os números devem ser strings e conter @c.us");
        }
      } catch (error) {
        toast({
          title: "Formato inválido",
          description: "Números autorizados devem estar no formato: [\"5599999999999@c.us\", \"5588888888888@c.us\"]",
          variant: "destructive",
        });
        return;
      }
    }

    // Se estamos atualizando e a API key está vazia ou mascarada, não enviar ela
    if (integration && (!data.apiKey || data.apiKey.trim() === '' || data.apiKey.includes('••••'))) {
      const { apiKey, ...dataWithoutApiKey } = data;
      console.log("📤 Dados finais (update sem API key):", dataWithoutApiKey);
      updateIntegrationMutation.mutate(dataWithoutApiKey);
    } else if (integration) {
      console.log("📤 Dados finais (update com API key):", data);
      updateIntegrationMutation.mutate(data);
    } else {
      console.log("📤 Dados finais (create):", data);
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
                            <Input 
                              type="password" 
                              placeholder={
                                integration?.hasApiKey 
                                  ? "Digite nova chave ou deixe em branco para manter atual" 
                                  : "sua-api-key"
                              }
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            {integration?.hasApiKey 
                              ? "✅ API Key salva. Deixe em branco para manter ou digite nova chave para substituir."
                              : "Chave de API da Evolution API"
                            }
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

                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium text-gray-900">Controle de Acesso</h4>
                      
                      <FormField
                        control={integrationForm.control}
                        name="responseMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modo de Resposta</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o modo de resposta" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="individual">Individual - Resposta privada para cada usuário</SelectItem>
                                <SelectItem value="group">Grupo - Resposta no grupo configurado</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              <strong>Individual:</strong> Respostas sempre enviadas no privado, mesmo se comando veio de grupo<br/>
                              <strong>Grupo:</strong> Respostas enviadas para o grupo configurado quando comando vem de membro autorizado
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {integrationForm.watch("responseMode") === "group" && (
                        <FormField
                          control={integrationForm.control}
                          name="allowedGroupJid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>JID do Grupo Autorizado</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="120363419788242278@g.us" 
                                  {...field} 
                                  className="font-mono text-sm"
                                />
                              </FormControl>
                              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                                <p className="text-sm text-blue-800 font-medium">JID detectado nos logs:</p>
                                <code className="text-xs text-blue-700">120363419788242278@g.us</code>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  className="ml-2 h-6 text-xs"
                                  onClick={() => {
                                    integrationForm.setValue("allowedGroupJid", "120363419788242278@g.us");
                                  }}
                                >
                                  Usar este JID
                                </Button>
                              </div>
                              <FormDescription>
                                <strong>Formato:</strong> números@g.us (ex: 120363419788242278@g.us)<br/>
                                <strong>Obtenção:</strong> Use webhook/logs para capturar o JID real do grupo
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={integrationForm.control}
                        name="authorizedNumbers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Números Autorizados</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder='["5599999999999@c.us", "5588888888888@c.us"]' 
                                {...field} 
                                className="min-h-[80px] font-mono text-sm"
                              />
                            </FormControl>
                            <FormDescription>
                              <strong>Formato obrigatório:</strong> Array JSON com números no formato internacional + @c.us<br/>
                              <strong>Exemplo:</strong> ["5599999999999@c.us", "5588888888888@c.us"]<br/>
                              <strong>Uso:</strong> Lista quem pode enviar comandos (individual ou como membro de grupo)<br/>
                              <strong>Importante:</strong> Use aspas duplas e inclua @c.us no final de cada número
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                        <p className="text-sm text-gray-600 mt-1">Listar tarefas ativas</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">nova [nome da tarefa]</code>
                        <p className="text-sm text-gray-600 mt-1">Criar nova tarefa</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">concluir [tarefa]</code>
                        <p className="text-sm text-gray-600 mt-1">Finalizar tarefa (para timer ativo também)</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">reabrir [tarefa]</code>
                        <p className="text-sm text-gray-600 mt-1">Reativar tarefa concluída</p>
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
                    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm">lancar-concluir [tarefa] [tempo]</code>
                        <p className="text-sm text-gray-600 mt-1">Lançar horas e finalizar tarefa</p>
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