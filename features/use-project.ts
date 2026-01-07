import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const useCreateProject = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ prompt, deviceType = 'mobile' }: { prompt: string; deviceType?: 'mobile' | 'web' }) =>
      await axios
        .post("/api/project", {
          prompt,
          deviceType,
        })
        .then((res) => res.data),
    onSuccess: (data) => {
      router.push(`/project/${data.data.id}`);
    },
    onError: (error) => {
      console.log("Project failed", error);
      toast.error("Failed to create project");
    },
  });
};

export const useGetProjects = (userId?: string) => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await axios.get("/api/project");
      return res.data.data;
    },
    enabled: !!userId,
  });
};

export const useUpdateProjectTheme = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (themeId: string) =>
      await axios
        .patch(`/api/project/${projectId}`, {
          themeId,
        })
        .then((res) => res.data),
    onSuccess: () => {
      // Invalidate project query to refetch with new theme
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error) => {
      console.log("Failed to update theme", error);
      toast.error("Failed to update theme");
    },
  });
};
