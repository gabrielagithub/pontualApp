import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatDate, calculateDaysOverdue } from "@/lib/timer-utils";
import type { TaskWithStats } from "@shared/schema";

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tasks: any[];
  type: "overdue" | "overtime" | "dueToday" | "dueTomorrow" | "nearingLimit";
}

export default function TaskDetailsModal({ isOpen, onClose, title, tasks, type }: TaskDetailsModalProps) {
  const renderTaskItem = (task: any) => {
    const getBadgeVariant = () => {
      switch (type) {
        case "overdue":
          return "destructive";
        case "overtime":
          return "destructive";
        case "dueToday":
          return "default";
        case "dueTomorrow":
          return "secondary";
        case "nearingLimit":
          return "outline";
        default:
          return "default";
      }
    };

    const getStatusText = () => {
      switch (type) {
        case "overdue":
          return `Atrasado ${calculateDaysOverdue(task.deadline)} dias`;
        case "overtime":
          return `Excedeu ${formatDuration(task.exceedingTime)}`;
        case "dueToday":
          return `Vence hoje`;
        case "dueTomorrow":
          return `Vence amanhã`;
        case "nearingLimit":
          return `${task.percentage}% do tempo utilizado`;
        default:
          return "";
      }
    };

    return (
      <div key={task.id} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{task.name}</h3>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
          </div>
          <div 
            className="w-4 h-4 rounded-full flex-shrink-0 ml-3 mt-1"
            style={{ backgroundColor: task.color }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <Badge variant={getBadgeVariant()}>
            {getStatusText()}
          </Badge>
          
          {(type === "overtime" || type === "nearingLimit") && task.estimatedHours && (
            <div className="text-gray-600">
              <span>Previsto: {task.estimatedHours}h</span>
              {task.totalTime && (
                <span className="ml-2">• Usado: {formatDuration(task.totalTime)}</span>
              )}
            </div>
          )}
          
          {(type === "overdue" || type === "dueToday" || type === "dueTomorrow") && task.deadline && (
            <div className="text-gray-600">
              <span>Prazo: {formatDate(task.deadline)}</span>
              {task.estimatedHours && (
                <span className="ml-2">• {task.estimatedHours}h previstas</span>
              )}
            </div>
          )}
        </div>

        {type === "nearingLimit" && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.percentage}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {title} ({tasks.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhuma tarefa encontrada nesta categoria.
            </div>
          ) : (
            tasks.map(renderTaskItem)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}