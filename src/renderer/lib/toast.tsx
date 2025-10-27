import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface ToastActionOptions {
  label: string;
  onClick: () => void;
}

interface CustomToastOptions {
  title: string;
  description?: string;
  action?: ToastActionOptions;
  duration?: number;
}

export function showSuccessToast(options: CustomToastOptions) {
  return toast.success(
    (t) => (
      <div className="flex items-start gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{options.title}</div>
          {options.description && (
            <div className="text-xs text-muted-foreground mt-1">
              {options.description}
            </div>
          )}
        </div>
        {options.action && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              options.action?.onClick();
              toast.dismiss(t.id);
            }}
            className="shrink-0"
          >
            {options.action.label}
          </Button>
        )}
      </div>
    ),
    { duration: options.duration }
  );
}

export function showErrorToast(options: CustomToastOptions) {
  return toast.error(
    (t) => (
      <div className="flex items-start gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{options.title}</div>
          {options.description && (
            <div className="text-xs text-muted-foreground mt-1">
              {options.description}
            </div>
          )}
        </div>
        {options.action && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              options.action?.onClick();
              toast.dismiss(t.id);
            }}
            className="shrink-0"
          >
            {options.action.label}
          </Button>
        )}
      </div>
    ),
    { duration: options.duration || 5000 }
  );
}

export function showLoadingToast(title: string, description?: string) {
  return toast.loading(
    <div className="flex items-start gap-3 w-full">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-1">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

export function showInfoToast(options: CustomToastOptions) {
  return toast(
    (t) => (
      <div className="flex items-start gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{options.title}</div>
          {options.description && (
            <div className="text-xs text-muted-foreground mt-1">
              {options.description}
            </div>
          )}
        </div>
        {options.action && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              options.action?.onClick();
              toast.dismiss(t.id);
            }}
            className="shrink-0"
          >
            {options.action.label}
          </Button>
        )}
      </div>
    ),
    { duration: options.duration }
  );
}

export function dismissToast(toastId: string) {
  toast.dismiss(toastId);
}

export function dismissAllToasts() {
  toast.dismiss();
}

