import { motion } from 'motion/react';
import { Dumbbell } from 'lucide-react';

export const SplashScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
    >
      <div className="relative flex flex-col items-center">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex h-24 w-24 items-center justify-center rounded-[1.8rem] bg-primary shadow-[0_0_60px_rgba(209,252,0,0.25)]"
        >
          <Dumbbell size={48} className="text-black" />
          <div className="absolute inset-0 rounded-[1.8rem] ring-2 ring-primary ring-offset-4 ring-offset-background animate-pulse opacity-50" />
        </motion.div>
        
        <h1 className="mt-8 font-headline text-3xl font-black uppercase tracking-[0.2em] text-on-background">
          KINETIC
        </h1>
        
        <div className="mt-6 flex gap-2">
           <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-primary" />
           <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-primary" />
           <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
      </div>
    </motion.div>
  );
};
