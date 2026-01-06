/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWebSocket } from "@/context/websocket-provider";
import { THEME_LIST, ThemeType } from "@/lib/themes";
import { FrameType } from "@/types/project";
import { useUpdateProjectTheme } from "@/features/use-project";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type LoadingStatusType =
  | "idle"
  | "running"
  | "analyzing"
  | "generating"
  | "completed";

interface CanvasContextType {
  theme?: ThemeType;
  setTheme: (id: string) => void;
  themes: ThemeType[];

  frames: FrameType[];
  setFrames: (frames: FrameType[]) => void;
  updateFrame: (id: string, data: Partial<FrameType>) => void;
  addFrame: (frame: FrameType) => void;

  selectedFrameId: string | null;
  selectedFrame: FrameType | null;
  setSelectedFrameId: (id: string | null) => void;

  loadingStatus: LoadingStatusType | null;
  setLoadingStatus: (status: LoadingStatusType | null) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const CanvasProvider = ({
  children,
  initialFrames,
  initialThemeId,
  hasInitialData,
  projectId,
}: {
  children: ReactNode;
  initialFrames: FrameType[];
  initialThemeId?: string;
  hasInitialData: boolean;
  projectId: string | null;
}) => {
  const [themeId, setThemeId] = useState<string>(
    initialThemeId || THEME_LIST[0].id
  );

  const [frames, setFrames] = useState<FrameType[]>(initialFrames);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  const [loadingStatus, setLoadingStatus] = useState<LoadingStatusType | null>(
    null
  );

  const processedCountRef = useRef(0);
  const expectedFramesCountRef = useRef(0); // Track expected number of frames
  const completedFramesCountRef = useRef(0); // Track completed frames

  // Mutation for updating project theme in database
  const updateThemeMutation = useUpdateProjectTheme(projectId || "");

  // Handle theme change - update both local state and database
  const handleSetTheme = useCallback(
    (newThemeId: string) => {
      // Optimistically update local state
      setThemeId(newThemeId);

      // Update database if projectId exists
      if (projectId) {
        updateThemeMutation.mutate(newThemeId);
      }
    },
    [projectId, updateThemeMutation]
  );

  const [prevProjectId, setPrevProjectId] = useState(projectId);
  if (projectId !== prevProjectId) {
    setPrevProjectId(projectId);
    setLoadingStatus(hasInitialData ? "idle" : "running");
    setFrames(initialFrames);
    setThemeId(initialThemeId || THEME_LIST[0].id);
    setSelectedFrameId(null);
    processedCountRef.current = 0; // Reset message counter when switching projects
    expectedFramesCountRef.current = 0; // Reset expected frames count
    completedFramesCountRef.current = 0; // Reset completed frames count
  }

  const theme = THEME_LIST.find((t) => t.id === themeId);
  const selectedFrame =
    selectedFrameId && frames.length !== 0
      ? frames.find((f) => f.id === selectedFrameId) || null
      : null;

  //Update the LoadingState with WebSocket real-time events
  const { freshData } = useWebSocket();

  useEffect(() => {
    if (!freshData || freshData.length === 0) return;

    // Only process new messages, not all history
    const newMessages = freshData.slice(processedCountRef.current);
    processedCountRef.current = freshData.length;

    newMessages.forEach((message) => {
      const { data, topic } = message;
      console.log("WebSocket topic", topic);
      console.log("WebSocket data", data);
      if (data.projectId !== projectId) return;

      switch (topic) {
        case "generation.start":
          const status = data.status;
          setLoadingStatus(status);
          // Reset counters when new generation starts
          expectedFramesCountRef.current = 0;
          completedFramesCountRef.current = 0;
          break;
        case "analysis.start":
          setLoadingStatus("analyzing");
          break;
        case "analysis.complete":
          setLoadingStatus("generating");
          if (data.theme) setThemeId(data.theme);
          break;
        case "frames.created":
          // Add empty frames with database IDs
          if (data.frames && data.frames.length > 0) {
            setFrames((prev) => [...prev, ...data.frames]);
            // Track expected number of frames to complete
            expectedFramesCountRef.current = data.frames.length;
            completedFramesCountRef.current = 0; // Reset completed count
            console.log(`Expected ${data.frames.length} frames to complete`);
          }
          break;
        case "frame.updated":
          // Update frame by database ID
          if (data.frame) {
            setFrames((prev) => {
              const newFrames = [...prev];
              const idx = newFrames.findIndex((f) => f.id === data.frameId);
              if (idx !== -1) {
                newFrames[idx] = data.frame;
              }
              return newFrames;
            });

            // Track completion
            completedFramesCountRef.current += 1;
            console.log(
              `Frame completed: ${completedFramesCountRef.current}/${expectedFramesCountRef.current}`
            );

            // Check if all frames are completed
            if (
              expectedFramesCountRef.current > 0 &&
              completedFramesCountRef.current >= expectedFramesCountRef.current
            ) {
              console.log("All frames completed!");
              setLoadingStatus("completed");
              setTimeout(() => {
                setLoadingStatus("idle");
              }, 100);
            }
          }
          break;
        case "generation.complete":
          setLoadingStatus("completed");
          setTimeout(() => {
            setLoadingStatus("idle");
          }, 100);
          break;
        default:
          break;
      }
    });
  }, [projectId, freshData]);

  const addFrame = useCallback((frame: FrameType) => {
    setFrames((prev) => [...prev, frame]);
  }, []);

  const updateFrame = useCallback((id: string, data: Partial<FrameType>) => {
    setFrames((prev) => {
      return prev.map((frame) =>
        frame.id === id ? { ...frame, ...data } : frame
      );
    });
  }, []);

  return (
    <CanvasContext.Provider
      value={{
        theme,
        setTheme: handleSetTheme,
        themes: THEME_LIST,
        frames,
        setFrames,
        selectedFrameId,
        selectedFrame,
        setSelectedFrameId,
        updateFrame,
        addFrame,
        loadingStatus,
        setLoadingStatus,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used inside CanvasProvider");
  return ctx;
};
