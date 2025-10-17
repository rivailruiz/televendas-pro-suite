import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { representantes } from '@/mocks/data';

const visitasMock = [
  { id: 1, data: '2025-10-17', representante: 'ALEXANDRE FERREIRA', cliente: '10 REGIMENTO DE CAVALARIA', cidade: 'BELA VISTA', tipo: 'Visita programada', status: 'pendente' },
  { id: 2, data: '2025-10-17', representante: 'ALEXANDRE FERREIRA', cliente: 'CASA DE CARIDADE SAO VICENTE DE PAULO', cidade: 'CAMPO GRANDE', tipo: 'Acompanhamento', status: 'pendente' },
  { id: 3, data: '2025-10-16', representante: 'ALEXANDRE FERREIRA', cliente: 'CLINICA VIDA E SAUDE', cidade: 'DOURADOS', tipo: 'Visita realizada', status: 'realizada' },
];

export const VisitasTab = () => {
  const [filters, setFilters] = useState({
    data: '',
    cidade: '',
    representante: ''
  });

  const handleRegistrarVisita = () => {
    toast.info('Abrindo formulário de registro de visita');
  };

  const handleNovoPedido = () => {
    toast.info('Criando novo pedido a partir de visita');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Data</label>
              <Input 
                type="date"
                value={filters.data}
                onChange={(e) => setFilters({...filters, data: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cidade</label>
              <Input 
                placeholder="Filtrar por cidade"
                value={filters.cidade}
                onChange={(e) => setFilters({...filters, cidade: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Representante</label>
              <Select value={filters.representante} onValueChange={(v) => setFilters({...filters, representante: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {representantes.map(r => (
                    <SelectItem key={r.id} value={r.nome}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {visitasMock.map((visita) => (
          <Card key={visita.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{new Date(visita.data).toLocaleDateString('pt-BR')}</span>
                    <Badge variant={visita.status === 'realizada' ? 'default' : 'secondary'}>
                      {visita.status === 'realizada' ? 'Realizada' : 'Pendente'}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-lg">{visita.cliente}</p>
                    <p className="text-sm text-muted-foreground">{visita.cidade}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserCheck className="h-4 w-4" />
                    <span>{visita.representante}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{visita.tipo}</p>
                </div>
                <div className="flex gap-2">
                  {visita.status === 'pendente' && (
                    <Button size="sm" variant="outline" onClick={handleRegistrarVisita}>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Registrar
                    </Button>
                  )}
                  <Button size="sm" onClick={handleNovoPedido}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Pedido
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <Button onClick={handleRegistrarVisita}>
          <UserCheck className="h-4 w-4 mr-2" />
          Registrar Visita
        </Button>
        <Button onClick={handleNovoPedido}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
      </div>
    </div>
  );
};
