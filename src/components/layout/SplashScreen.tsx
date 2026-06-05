import { Dumbbell } from 'lucide-react';

export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.8rem] bg-primary shadow-[0_0_60px_rgba(209,252,0,0.25)]">
          <Dumbbell size={48} className="text-black" />
          <div className="absolute inset-0 rounded-[1.8rem] ring-2 ring-primary ring-offset-4 ring-offset-background animate-pulse opacity-50" />
        </div>
        
        <h1 className="mt-8 font-headline text-3xl font-black uppercase tracking-[0.2em] text-on-background">
          KINETIC
        </h1>
        
        <div className="mt-6 flex gap-2">
           <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
           <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
           <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
};
