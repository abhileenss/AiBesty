import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/utils";
import type { Message } from "@/lib/types";

interface TranscriptModalProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
}

export function TranscriptModal({ open, onClose, messages }: TranscriptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="font-poppins font-bold text-xl">Conversation</DialogTitle>
          <DialogDescription>
            {messages.length 
              ? "Your conversation history with Besty"
              : "Your conversation will appear here as you chat"
            }
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No messages yet. Start talking to begin your conversation.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-1">
                    {message.isUserMessage ? 'You' : 'Besty'} • {formatTime(new Date(message.createdAt))}
                  </span>
                  <div className={`p-3 rounded-lg ${
                    message.isUserMessage ? 'bg-gray-100' : 'bg-primary bg-opacity-10'
                  }`}>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button 
            className="w-full py-2 bg-primary text-white rounded-full"
            onClick={onClose}
          >
            Return to Conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
