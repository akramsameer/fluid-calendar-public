import { useEffect, useMemo } from "react";
import { Command } from "@/lib/commands/types";
import { commandRegistry } from "@/lib/commands/registry";
import { useCalendarCommands } from "@/lib/commands/groups/calendar";
import { useNavigationCommands } from "@/lib/commands/groups/navigation";
import { useTaskCommands } from "@/lib/commands/groups/tasks";
import { useSystemCommands } from "@/lib/commands/groups/system";
import { useFocusCommands } from "@/lib/commands/groups/focus";
import { usePrivacyCommands } from "@/lib/commands/groups/privacy";
import { usePathname, useRouter } from "next/navigation";

export function useCommands() {
  const calendarCommands = useCalendarCommands();
  const navigationCommands = useNavigationCommands();
  const taskCommands = useTaskCommands();
  const systemCommands = useSystemCommands();
  const focusCommands = useFocusCommands();
  const privacyCommands = usePrivacyCommands();
  const pathname = usePathname();
  const router = useRouter();

  // Register commands on mount
  useEffect(() => {
    // Clear existing commands to avoid duplicates
    const existingCommands = commandRegistry.getAll();
    existingCommands.forEach((cmd) => {
      commandRegistry.unregister(cmd.id);
    });

    const commands = [
      ...calendarCommands,
      ...navigationCommands,
      ...taskCommands,
      ...systemCommands,
      ...focusCommands,
      ...privacyCommands,
      // Add other command groups here as we create them
    ];

    console.log(
      "Registering commands:",
      commands.map((cmd) => ({ id: cmd.id, shortcut: cmd.shortcut }))
    );

    // Register all commands
    commands.forEach((command) => {
      commandRegistry.register(command);
    });

    // Log all registered commands
    console.log(
      "All registered commands:",
      commandRegistry
        .getAll()
        .map((cmd) => ({ id: cmd.id, shortcut: cmd.shortcut }))
    );

    // Cleanup on unmount
    return () => {
      commands.forEach((command) => {
        commandRegistry.unregister(command.id);
      });
    };
  }, [
    calendarCommands,
    navigationCommands,
    taskCommands,
    systemCommands,
    focusCommands,
    privacyCommands,
  ]);

  // Handle keyboard shortcuts
  useEffect(() => {
    // Map arrow keys to their shortcut names
    const keyMap: Record<string, string> = {
      arrowleft: "left",
      arrowright: "right",
      arrowup: "up",
      arrowdown: "down",
    };

    // For letter-based shortcuts
    let pressedKeys: string[] = [];
    let lastKeyPressTime = 0;
    const KEY_SEQUENCE_TIMEOUT = 1000; // 1 second timeout for key sequences

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Get the key and apply mapping if needed
      const key = e.key.toLowerCase();
      const mappedKey = keyMap[key] || key;

      // For arrow keys, we want to handle them directly
      if (mappedKey === "left" || mappedKey === "right") {
        console.log("Arrow key pressed:", mappedKey);

        // Find a command with this shortcut
        const commands = commandRegistry.getAll();
        const command = commands.find((cmd) => cmd.shortcut === mappedKey);

        if (command) {
          console.log("Command found for arrow key:", command.id);
          e.preventDefault();
          await commandRegistry.execute(command.id, router);
          return;
        }
      }

      // Check if we're using modifier keys or letter sequences
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        // Using modifier keys
        // Build the shortcut string with modifiers
        let shortcut = "";
        if (e.altKey) shortcut += "alt+";
        if (e.ctrlKey) shortcut += "ctrl+";
        if (e.metaKey) shortcut += "meta+";
        if (e.shiftKey) shortcut += "shift+";
        shortcut += mappedKey;

        console.log("Modifier shortcut pressed:", shortcut);

        // Find a command with this shortcut
        const commands = commandRegistry.getAll();
        const command = commands.find((cmd) => cmd.shortcut === shortcut);

        if (command) {
          console.log("Command found:", command.id);
          e.preventDefault();
          await commandRegistry.execute(command.id, router);
        }
      } else {
        // Using letter sequences
        const currentTime = Date.now();

        // If it's been too long since the last keypress, reset the sequence
        if (currentTime - lastKeyPressTime > KEY_SEQUENCE_TIMEOUT) {
          pressedKeys = [];
        }

        // Add the current key to the sequence
        pressedKeys.push(mappedKey);
        lastKeyPressTime = currentTime;

        // Only keep the last 3 keys (for efficiency)
        if (pressedKeys.length > 3) {
          pressedKeys = pressedKeys.slice(-3);
        }

        // Try different combinations of the pressed keys
        const keyCombinations = [
          pressedKeys.join(""), // All keys together
          pressedKeys.slice(-2).join(""), // Last 2 keys
          pressedKeys.slice(-1).join(""), // Just the last key
        ];

        console.log("Key combinations:", keyCombinations);

        // Find a command with any of these shortcuts
        const commands = commandRegistry.getAll();
        for (const combo of keyCombinations) {
          const command = commands.find((cmd) => cmd.shortcut === combo);
          if (command) {
            console.log("Command found:", command.id, "for combo:", combo);
            e.preventDefault();
            await commandRegistry.execute(command.id, router);
            // Reset the sequence after executing a command
            pressedKeys = [];
            break;
          }
        }
      }
    };

    // Add event listener
    console.log("Adding keydown event listener");
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      console.log("Removing keydown event listener");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname, router]);

  const api = useMemo(
    () => ({
      getAllCommands: () => commandRegistry.getAll(),
      getCommandsBySection: (section: Command["section"]) =>
        commandRegistry.getBySection(section),
      searchCommands: (query: string) => commandRegistry.search(query),
      executeCommand: (commandId: string) =>
        commandRegistry.execute(commandId, router),
    }),
    [router]
  );

  return api;
}
