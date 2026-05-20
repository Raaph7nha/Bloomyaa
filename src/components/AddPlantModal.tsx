import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Plus, Loader2, Camera } from 'lucide-react';

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export function AddPlantModal({ isOpen, onClose, onSuccess, token }: AddPlantModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    luz: '',
    riego: '',
    tipo: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const data = new FormData();
    data.append('nombre', formData.nombre);
    data.append('descripcion', formData.descripcion);
    data.append('luz', formData.luz);
    data.append('riego', formData.riego);
    data.append('tipo', formData.tipo);
    if (imageFile) {
      data.append('image', imageFile);
    }

    try {
      const response = await fetch('/api/user/plants', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error && errorData.error.includes('Límite')) {
          setError('Has alcanzado el límite de 5 plantas para usuarios gratuitos. ¡Pásate a Premium para tener un jardín ilimitado!');
          setLoading(false);
          return;
        }
        throw new Error(errorData.error || 'Error al guardar la planta');
      }

      onSuccess();
      onClose();
      // Reset form
      setFormData({ nombre: '', descripcion: '', luz: '', riego: '', tipo: '' });
      setPreview(null);
      setImageFile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] glass border-white/50 rounded-[32px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <Plus className="w-6 h-6" />
            Nueva Planta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <div 
              className="w-full h-48 bg-white/40 border-2 border-dashed border-white/60 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
              onClick={() => document.getElementById('plant-image')?.click()}
            >
              {preview ? (
                <>
                  <img src={preview} alt="Vista previa" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="text-white w-8 h-8" />
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Sube una foto de tu planta</p>
                </div>
              )}
            </div>
            <input 
              id="plant-image"
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Nombre</label>
              <Input 
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                placeholder="Ej: Monstera Albo" 
                required
                className="bg-white/40 border-white/50 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Tipo</label>
              <Input 
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                placeholder="Ej: Interior" 
                className="bg-white/40 border-white/50 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Descripción</label>
            <textarea 
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              className="w-full min-h-[80px] p-3 bg-white/40 border border-white/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="Cuéntanos sobre tu planta..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Luz</label>
              <Input 
                value={formData.luz}
                onChange={(e) => setFormData({...formData, luz: e.target.value})}
                placeholder="Ej: Indirecta brillante" 
                className="bg-white/40 border-white/50 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Riego</label>
              <Input 
                value={formData.riego}
                onChange={(e) => setFormData({...formData, riego: e.target.value})}
                placeholder="Ej: Cada 7 días" 
                className="bg-white/40 border-white/50 rounded-xl"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-center font-medium text-red-500">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-[2] h-12 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Planta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
