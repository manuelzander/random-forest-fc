import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Newspaper, Plus, Edit, Trash2, Eye, EyeOff, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  author_id: string;
}

const AdminNewsManagement = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<NewsItem | null>(null);
  const [isSavingNews, setIsSavingNews] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    published: true
  });

  useEffect(() => {
    if (userRole === 'admin') {
      fetchNews();
    }
  }, [userRole]);

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Error",
        description: "Failed to fetch news",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSavingNews) return; // Prevent double submission

    try {
      setIsSavingNews(true);
      
      if (editingItem) {
        // Update existing news
        const { error } = await (supabase as any)
          .from('news')
          .update({
            title: formData.title,
            content: formData.content,
            published: formData.published
          })
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "News article updated successfully",
        });
      } else {
        // Create new news
        const { error } = await (supabase as any)
          .from('news')
          .insert([{
            title: formData.title,
            content: formData.content,
            published: formData.published,
            author_id: user.id
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "News article created successfully",
        });
      }

      setFormData({ title: '', content: '', published: true });
      setEditingItem(null);
      setIsDialogOpen(false);
      fetchNews();
    } catch (error) {
      console.error('Error saving news:', error);
      toast({
        title: "Error",
        description: "Failed to save news article",
        variant: "destructive",
      });
    } finally {
      setIsSavingNews(false);
    }
  };

  const handleEdit = (item: NewsItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content || '',
      published: item.published
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (article: NewsItem) => {
    setArticleToDelete(article);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!articleToDelete) return;

    try {
      const { error } = await (supabase as any)
        .from('news')
        .delete()
        .eq('id', articleToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "News article deleted successfully",
      });
      fetchNews();
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    } catch (error) {
      console.error('Error deleting news:', error);
      toast({
        title: "Error",
        description: "Failed to delete news article",
        variant: "destructive",
      });
    }
  };

  const togglePublished = async (item: NewsItem) => {
    try {
      const { error } = await (supabase as any)
        .from('news')
        .update({ published: !item.published })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `News article ${!item.published ? 'published' : 'unpublished'} successfully`,
      });
      fetchNews();
    } catch (error) {
      console.error('Error updating news:', error);
      toast({
        title: "Error",
        description: "Failed to update news article",
        variant: "destructive",
      });
    }
  };

  if (userRole !== 'admin') {
    return (
      <Alert>
        <AlertDescription>
          You need admin privileges to manage news articles.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <div>Loading news management...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Newspaper className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">News Management</span>
          <span className="sm:hidden">News</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <h3 className="text-base sm:text-lg font-semibold">News Articles ({news.length})</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ title: '', content: '', published: true });
                }}
              >
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add News</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  {editingItem ? 'Edit News Article' : 'Add New Article'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    placeholder="Article title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Article content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  />
                  <label htmlFor="published" className="text-sm">
                    Publish immediately
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSavingNews}>
                    {isSavingNews ? 'Saving...' : editingItem ? 'Update Article' : 'Create Article'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSavingNews}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {news.length === 0 ? (
          <Alert>
            <AlertDescription>
              No news articles yet. Create your first article!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {news.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold">{item.title}</h3>
                      <Badge variant={item.published ? "default" : "secondary"} className="w-fit">
                        {item.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    {item.content && (
                      <p className="text-muted-foreground mb-2 line-clamp-2 text-sm sm:text-base">{item.content}</p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                        Created: {format(new Date(item.created_at), 'PPp')}
                      </div>
                      {item.updated_at !== item.created_at && (
                        <div>
                          Updated: {format(new Date(item.updated_at), 'PPp')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 justify-center sm:ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublished(item)}
                    >
                      {item.published ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(item)}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete News Article</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{articleToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete Article
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AdminNewsManagement;