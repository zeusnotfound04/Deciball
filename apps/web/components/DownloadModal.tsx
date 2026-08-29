import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  songData: {
    title: string;
    author: string;
    youtubeUrl: string;
    thumbnail: string;
    converterOptions: Array<{
      name: string;
      url: string;
      description: string;
    }>;
  };
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  songData
}) => {
  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(songData.youtubeUrl);
      toast.success('URL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const handleConverterClick = (converterUrl: string) => {
    window.open(converterUrl, '_blank', 'noopener,noreferrer');
    toast.info('Opened converter in new tab');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-void-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-midnight-surface border border-graphite rounded-cards p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif font-semibold text-paper-white">Download Audio</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-steel-gray hover:text-paper-white p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Song Info */}
            <div className="flex items-start space-x-4 mb-6">
              <img
                src={songData.thumbnail}
                alt={songData.title}
                className="w-16 h-16 rounded-album-art object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-paper-white font-medium line-clamp-2 mb-1">
                  {songData.title}
                </h4>
                <p className="text-steel-gray font-mono text-sm">by {songData.author}</p>
              </div>
            </div>

            {/* Download Options */}
            <div className="space-y-3">
              <p className="text-sm text-ghost-gray mb-4">Choose a download service:</p>
              
              {songData.converterOptions.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleConverterClick(option.url)}
                  className="w-full text-left p-4 rounded-cards border border-graphite hover:border-slate-custom transition-all duration-200 bg-graphite hover:bg-charcoal group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-paper-white font-medium group-hover:text-electric-cyan transition-colors">
                        {option.name}
                      </div>
                      <div className="text-steel-gray font-mono text-xs mt-1">
                        {option.description}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-steel-gray group-hover:text-electric-cyan transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* URL Copy Section */}
            <div className="mt-6 p-4 bg-deep-teal border border-graphite rounded-cards">
              <div className="flex items-start justify-between mb-2">
                <p className="text-electric-cyan text-sm font-medium">
                  💡 Or copy the URL for any converter:
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyUrlToClipboard}
                  className="text-electric-cyan hover:text-electric-cyan/80 p-1"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <code className="text-electric-cyan/70 font-mono text-xs break-all bg-graphite p-2 rounded block">
                {songData.youtubeUrl}
              </code>
            </div>

            {/* Note */}
            <p className="text-xs text-steel-gray font-mono mt-4 text-center">
              Note: These are third-party services. Download quality may vary.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
