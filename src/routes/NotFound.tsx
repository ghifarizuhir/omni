import React from 'react';
import { FileQuestion, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="w-16 h-16 rounded-full bg-ois-danger-pale flex items-center justify-center text-ois-danger mb-6">
        <FileQuestion size={32} />
      </div>
      <h1 className="text-2xl font-bold text-ois-text mb-2">404 - Page Not Found</h1>
      <p className="text-ois-text-muted max-w-md mb-8">
        We couldn't find the configuration item or resource you were looking for. 
        It might have been retired or you may not have sufficient permissions.
      </p>
      <Link to="/">
        <Button variant="primary" className="flex items-center gap-2">
          <Home size={18} />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};
