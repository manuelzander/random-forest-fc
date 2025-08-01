import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
    if (!user) return;

    try {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news article?')) return;

    try {
      const { error } = await (supabase as any)
        .from('news')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "News article deleted successfully",
      });
      fetchNews();
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
      <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Newspaper className="h-6 w-6" />
            News Management
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ title: '', content: '', published: true });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add News
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
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
                  <Button type="submit">
                    {editingItem ? 'Update Article' : 'Create Article'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {news.length === 0 ? (
          <div className="text-center py-8">
            <Newspaper className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No news articles yet. Create your first article!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <Badge variant={item.published ? "default" : "secondary"}>
                        {item.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    {item.content && (
                      <p className="text-gray-700 mb-2 line-clamp-2">{item.content}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created: {format(new Date(item.created_at), 'PPp')}
                      </div>
                      {item.updated_at !== item.created_at && (
                        <div>
                          Updated: {format(new Date(item.updated_at), 'PPp')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublished(item)}
                    >
                      {item.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminNewsManagement;