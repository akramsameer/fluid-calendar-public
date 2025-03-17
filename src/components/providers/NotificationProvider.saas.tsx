"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

type NotificationType = "success" | "error" | "info" | "warning";

interface Notification {
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  const showNotification = (notification: Notification) => {
    console.log("showNotification called with:", notification);
    const { title, message, type } = notification;

    // Common toast options
    const toastOptions = {
      description: message,
      className: "notification-toast", // Use our global CSS class
      duration: 5000, // Show for 5 seconds
    };

    switch (type) {
      case "success":
        toast.success(title, toastOptions);
        break;
      case "error":
        toast.error(title, toastOptions);
        break;
      case "info":
        toast.info(title, toastOptions);
        break;
      case "warning":
        toast.warning(title, toastOptions);
        break;
      default:
        toast(title, toastOptions);
    }
  };

  // Listen for custom events from the task store
  useEffect(() => {
    if (!isClient) return;

    // Create a custom event listener for task scheduling completion
    const handleTaskScheduleComplete = (event: CustomEvent) => {
      console.log("Received custom task schedule complete event", event.detail);
      showNotification({
        title: "Task Scheduling Complete",
        message: "Your tasks have been scheduled",
        type: "success",
      });
    };

    // Add event listener
    window.addEventListener(
      "task-schedule-complete",
      handleTaskScheduleComplete as EventListener
    );

    // Clean up
    return () => {
      window.removeEventListener(
        "task-schedule-complete",
        handleTaskScheduleComplete as EventListener
      );
    };
  }, [isClient]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
