import { motion } from 'motion/react';
import { Sprout } from 'lucide-react';

export function GlobalLoader() {
  return (
    <div className="fixed inset-0 z-[300] bg-background/80 backdrop-blur-md flex items-center justify-center">
      <div className="text-center space-y-4">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2,
            ease: "easeInOut"
          }}
          className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/20"
        >
          <Sprout className="w-10 h-10" />
        </motion.div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 animate-pulse">Cargando...</p>
      </div>
    </div>
  );
}
