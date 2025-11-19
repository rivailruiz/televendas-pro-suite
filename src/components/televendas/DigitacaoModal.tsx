import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DigitacaoTab } from './DigitacaoTab';

interface DigitacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DigitacaoModal = ({ open, onOpenChange }: DigitacaoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2 sticky top-0 bg-background z-10 border-b">
          <DialogTitle>Digitação de Pedido</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <DigitacaoTab />
        </div>
      </DialogContent>
    </Dialog>
  );
};
