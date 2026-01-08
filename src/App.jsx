import { useState, useEffect, useCallback } from 'react';
import { db, notesCollectionRef } from './firebase';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

function App() {
  // Core state
  const [notes, setNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', body: '', tags: '' });
  const [editingNoteId, setEditingNoteId] = useState(null);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all notes
  useEffect(() => {
    const q = query(
      notesCollectionRef,
      orderBy('pinned', 'desc'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotes(notesData);
      setAllNotes(notesData); 
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

 
  useEffect(() => {
    if (!searchQuery.trim()) {
      setNotes(allNotes);
      return;
    }

    const filtered = allNotes.filter((note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.tags && note.tags.some(tag => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    );
    setNotes(filtered);
  }, [searchQuery, allNotes]);

  // Handlers (existing + tag parsing)
  const parseTags = (tagsString) => {
    return tagsString
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
  };

  const handleNewNoteClick = () => {
    setNewNote({ title: '', body: '', tags: '' });
    setEditingNoteId(null);
    setOpenDialog(true);
  };

  const handleTogglePin = async (noteId, currentPinned) => {
    try {
      const noteRef = doc(db, 'notes', noteId);
      await updateDoc(noteRef, {
        pinned: !currentPinned,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleEditNote = (note) => {
    setNewNote({ 
      title: note.title, 
      body: note.body, 
      tags: note.tags ? note.tags.join(', ') : '' 
    });
    setEditingNoteId(note.id);
    setOpenDialog(true);
  };

  const handleSaveNote = async () => {
    if (!newNote.title.trim()) return;

    try {
      const tags = parseTags(newNote.tags);

      if (editingNoteId) {
        const noteRef = doc(db, 'notes', editingNoteId);
        await updateDoc(noteRef, {
          title: newNote.title.trim(),
          body: newNote.body.trim(),
          tags,
          updatedAt: serverTimestamp(),
        });
        setEditingNoteId(null);
      } else {
        await addDoc(notesCollectionRef, {
          title: newNote.title.trim(),
          body: newNote.body.trim(),
          tags,
          pinned: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setOpenDialog(false);
      setNewNote({ title: '', body: '', tags: '' });
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewNote({ title: '', body: '', tags: '' });
    setEditingNoteId(null);
  };

  const handleConfirmDelete = (note) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await deleteDoc(doc(db, 'notes', noteToDelete.id));
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  
  const debouncedSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    // Simple debounce with timeout
    if (window.searchTimeout) clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => debouncedSearch(query), 300);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Smart Notes ({notes.length})
          </Typography>
          <TextField
            variant="outlined"
            placeholder="Search notes..."
            size="small"
            sx={{ 
              mr: 2, 
              minWidth: 200,
              '& .MuiOutlinedInput-root': { 
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
              },
              '&:hover .MuiOutlinedInput-root fieldset': { borderColor: 'white' }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'inherit' }} />
                </InputAdornment>
              ),
            }}
            onChange={handleSearchChange}
          />
          <Button 
            color="inherit" 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={handleNewNoteClick}
          >
            New Note
          </Button>
        </Toolbar>
      </AppBar>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNoteId ? 'Edit Note' : 'New Note'}
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Title *"
            type="text"
            fullWidth
            variant="standard"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            sx={{ mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Body"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="standard"
            value={newNote.body}
            onChange={(e) => setNewNote({ ...newNote, body: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="Tags (comma separated)"
            type="text"
            fullWidth
            variant="standard"
            value={newNote.tags}
            onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
            helperText="e.g. gaming, dota, design"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveNote} 
            variant="contained"
            disabled={!newNote.title.trim()}
          >
            {editingNoteId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Note?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{noteToDelete?.title}"? 
            This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteNote} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Container sx={{ flex: 1, py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Your Notes
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : notes.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No notes yet. Create your first one above! ✨
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {notes.map((note) => (
              <Card key={note.id} elevation={2}>
                <CardContent sx={{ pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" gutterBottom sx={{ flexGrow: 1 }}>
                      {note.title}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleTogglePin(note.id, note.pinned)}
                      color={note.pinned ? "primary" : "default"}
                    >
                      {note.pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {note.body}
                  </Typography>
                  {note.tags?.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {note.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" color="primary" variant="outlined" />
                      ))}
                    </Box>
                  )}
                </CardContent>
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <IconButton size="small" onClick={() => handleEditNote(note)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleConfirmDelete(note)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default App;
