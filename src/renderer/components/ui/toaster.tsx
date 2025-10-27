import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "hsl(var(--card))",
          color: "hsl(var(--card-foreground))",
          border: "1px solid hsl(var(--border))",
          padding: "12px 16px",
          borderRadius: "8px",
          fontSize: "14px",
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          maxWidth: "420px",
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: "#34c759",
            secondary: "white",
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: "#ff3b30",
            secondary: "white",
          },
        },
        loading: {
          iconTheme: {
            primary: "hsl(var(--primary))",
            secondary: "white",
          },
        },
      }}
    />
  );
}

