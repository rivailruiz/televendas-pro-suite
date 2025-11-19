import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DigitacaoTab } from './DigitacaoTab';

interface DigitacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DigitacaoModal = ({ open, onOpenChange }: DigitacaoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1400px] h-[95vh] max-h-[900px] p-0 flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b shrink-0">
          <DialogTitle className="text-base sm:text-lg">Digitação de Pedido</DialogTitle>
        </DialogHeader>
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 overflow-y-auto flex-1">
          <DigitacaoTab onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
