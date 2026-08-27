import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save, ExternalLink } from "lucide-react";import { UniversalSpinner } from "@/components/ui/UniversalLoader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NotebookChapter {
  id: string;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  notebook_lm_link: string | null;
  is_visible: boolean;
  display_order: number | null;
}

const subjects = ["Physics", "Chemistry", "Mathematics", "Biology"];

const subjectIcons: Record<string, string> = {
  Physics: "⚛️",
  Chemistry: "🧪",
  Mathematics: "📐",
  Biology: "🌱",
};

export default function NotebookLMManagement() {
  const queryClient = useQueryClient();
  const [activeSubject, setActiveSubject] = useState("Physics");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newChapter, setNewChapter] = useState({
    subject: "Physics",
    chapter_number: 1,
    chapter_name: "",
    notebook_lm_link: "",
  });

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["admin-notebook-chapters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notebook_lm_chapters")
        .select("*")
        .order("subject")
        .order("chapter_number");

      if (error) throw error;
      return data as NotebookChapter[];
    },
  });

  const addChapterMutation = useMutation({
    mutationFn: async (chapter: typeof newChapter) => {
      const { error } = await supabase.from("notebook_lm_chapters").insert({
        subject: chapter.subject,
        chapter_number: chapter.chapter_number,
        chapter_name: chapter.chapter_name,
        notebook_lm_link: chapter.notebook_lm_link || null,
        is_visible: true,
        display_order: chapter.chapter_number,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notebook-chapters"] });
      toast.success("Chapter added successfully!");
      setIsAddDialogOpen(false);
      setNewChapter({
        subject: activeSubject,
        chapter_number: 1,
        chapter_name: "",
        notebook_lm_link: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to add chapter: " + error.message);
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<NotebookChapter>;
    }) => {
      const { error } = await supabase
        .from("notebook_lm_chapters")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notebook-chapters"] });
      toast.success("Chapter updated!");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notebook_lm_chapters")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notebook-chapters"] });
      toast.success("Chapter deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const getChaptersBySubject = (subject: string) => {
    return chapters?.filter((ch) => ch.subject === subject) || [];
  };

  const handleLinkUpdate = (id: string, link: string) => {
    updateChapterMutation.mutate({ id, updates: { notebook_lm_link: link || null } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">NotebookLM Management</h2>
          <p className="text-muted-foreground">
            Manage chapter-wise NotebookLM links for Class 12th
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Chapter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Chapter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={newChapter.subject}
                  onValueChange={(v) =>
                    setNewChapter({ ...newChapter, subject: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>
                        {subjectIcons[s]} {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chapter Number</Label>
                <Input
                  type="number"
                  min={1}
                  value={newChapter.chapter_number}
                  onChange={(e) =>
                    setNewChapter({
                      ...newChapter,
                      chapter_number: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Chapter Name</Label>
                <Input
                  placeholder="Enter chapter name"
                  value={newChapter.chapter_name}
                  onChange={(e) =>
                    setNewChapter({ ...newChapter, chapter_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>NotebookLM Link (optional)</Label>
                <Input
                  placeholder="https://notebooklm.google.com/..."
                  value={newChapter.notebook_lm_link}
                  onChange={(e) =>
                    setNewChapter({
                      ...newChapter,
                      notebook_lm_link: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={() => addChapterMutation.mutate(newChapter)}
                disabled={!newChapter.chapter_name || addChapterMutation.isPending}
              >
                {addChapterMutation.isPending ? (
                  <UniversalSpinner size={16} className="mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Chapter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeSubject} onValueChange={setActiveSubject}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          {subjects.map((subject) => (
            <TabsTrigger key={subject} value={subject}>
              {subjectIcons[subject]} {subject}
            </TabsTrigger>
          ))}
        </TabsList>

        {subjects.map((subject) => (
          <TabsContent key={subject} value={subject}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{subjectIcons[subject]}</span>
                  {subject} Chapters
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <UniversalSpinner size={32} className="text-muted-foreground" />
                  </div>
                ) : getChaptersBySubject(subject).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No chapters added yet.</p>
                    <Button
                      variant="link"
                      onClick={() => {
                        setNewChapter({ ...newChapter, subject });
                        setIsAddDialogOpen(true);
                      }}
                    >
                      Add first chapter
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>Chapter Name</TableHead>
                          <TableHead>NotebookLM Link</TableHead>
                          <TableHead className="w-24">Visible</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getChaptersBySubject(subject).map((chapter) => (
                          <TableRow key={chapter.id}>
                            <TableCell className="font-medium">
                              {chapter.chapter_number}
                            </TableCell>
                            <TableCell>{chapter.chapter_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Add link..."
                                  defaultValue={chapter.notebook_lm_link || ""}
                                  className="max-w-xs"
                                  onBlur={(e) =>
                                    handleLinkUpdate(chapter.id, e.target.value)
                                  }
                                />
                                {chapter.notebook_lm_link && (
                                  <a
                                    href={chapter.notebook_lm_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={chapter.is_visible}
                                onCheckedChange={(checked) =>
                                  updateChapterMutation.mutate({
                                    id: chapter.id,
                                    updates: { is_visible: checked },
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  deleteChapterMutation.mutate(chapter.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}