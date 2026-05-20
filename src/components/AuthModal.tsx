import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Loader2, Sprout } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Algo salió mal');
      }

      if (isLogin) {
        onSuccess(data.token, data.user);
        onClose();
      } else {
        // Después de registro, cambiar a login
        setIsLogin(true);
        setError('¡Registro exitoso! Por favor inicia sesión.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] bg-background border-none rounded-[40px] p-0 overflow-hidden shadow-soft">
        <div className="relative p-8 lg:p-12">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

          <DialogHeader className="items-center text-center relative z-10 space-y-4">
            <div className="w-16 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center shadow-high mb-2">
              <Sprout className="w-8 h-8" />
            </div>
            <DialogTitle className="text-4xl font-serif font-black text-primary italic leading-none">
              {isLogin ? 'Bienvenido' : 'Únete'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/60 font-medium max-w-[240px]">
              {isLogin ? 'Vuelve a tu oasis personal en Bloomy' : 'Comienza tu viaje botánico hoy mismo'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-10 pb-4 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/30 ml-2">Email / Usuario</label>
              <Input 
                type="text" 
                placeholder="Naturaleza o tu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 bg-muted/30 border-none rounded-2xl px-6 focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/30 ml-2">Contraseña</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 bg-muted/30 border-none rounded-2xl px-6 focus:ring-4 focus:ring-primary/5 transition-all text-lg"
              />
            </div>

            {error && (
              <p className={`text-xs text-center font-bold tracking-tight py-2 px-4 rounded-xl ${error.includes('exitoso') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {error}
              </p>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-primary text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-high hover:scale-[1.02] active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Acceder al Jardín' : 'Plantas mi Semilla')}
            </Button>

            <div className="pt-4 flex flex-col items-center gap-4">
              <div className="w-12 h-px bg-border/40" />
              <p className="text-xs font-semibold text-muted-foreground/50">
                {isLogin ? '¿Aún no eres parte?' : '¿Ya tienes un lugar?'}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary font-black ml-2 hover:underline underline-offset-4"
                >
                  {isLogin ? 'Regístrate Aquí' : 'Inicia Sesión'}
                </button>
              </p>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
