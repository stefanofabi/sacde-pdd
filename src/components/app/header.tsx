import { PiggyBank } from 'lucide-react';
import React from 'react';

const Header = () => {
  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8 border-b">
      <div className="container mx-auto flex items-center gap-3">
        <PiggyBank className="w-8 h-8 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-gray-800 dark:text-gray-100">
          <span className="text-primary">Tip</span>Split
        </h1>
      </div>
    </header>
  );
};

export default Header;
