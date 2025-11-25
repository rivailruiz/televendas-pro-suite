import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { DigitacaoTab } from './DigitacaoTab';

interface DigitacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DigitacaoModal = ({ open, onOpenChange }: DigitacaoModalProps) => {
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowConfirmClose(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmClose(false);
    onOpenChange(false);
  };

  const handleCancelClose = () => {
    setShowConfirmClose(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[95vw] max-w-[1400px] h-[95vh] max-h-[900px] p-0 flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b shrink-0">
            <DialogTitle className="text-base sm:text-lg">Digitação de Pedido</DialogTitle>
          </DialogHeader>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 overflow-y-auto flex-1">
            <DigitacaoTab onClose={() => setShowConfirmClose(true)} />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as alterações não salvas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
