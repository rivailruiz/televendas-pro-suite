import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { itinerarios, representantes } from '@/mocks/data';

export const ItinerariosTab = () => {
  const [filteredData, setFilteredData] = useState(itinerarios);
  const [filters, setFilters] = useState({
    representante: '',
    cidade: '',
    clienteId: '',
    visita: ''
  });

  useEffect(() => {
    let filtered = [...itinerarios];

    if (filters.representante) {
      const rep = representantes.find(r => r.nome === filters.representante);
      if (rep) {
        filtered = filtered.filter(i => i.representanteId === rep.id);
      }
    }
    if (filters.cidade) {
      filtered = filtered.filter(i => i.cidade.toLowerCase().includes(filters.cidade.toLowerCase()));
    }
    if (filters.clienteId) {
      filtered = filtered.filter(i => i.id.toString().includes(filters.clienteId));
    }
    if (filters.visita) {
      filtered = filtered.filter(i => i.visita.toLowerCase().includes(filters.visita.toLowerCase()));
    }

    setFilteredData(filtered);
  }, [filters]);

  const handleReagendar = (id: number) => {
    toast.info(`Reagendando visita para cliente ${id}`);
  };

  const handleNovoPedido = (clienteId: number) => {
    toast.info(`Criando novo pedido para cliente ${clienteId}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
            <div>
              <label className="text-sm font-medium mb-2 block">Cidade</label>
              <Input 
                placeholder="Filtrar por cidade"
                value={filters.cidade}
                onChange={(e) => setFilters({...filters, cidade: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cliente ID</label>
              <Input 
                placeholder="ID do cliente"
                value={filters.clienteId}
                onChange={(e) => setFilters({...filters, clienteId: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Visita</label>
              <Input 
                placeholder="Tipo de visita"
                value={filters.visita}
                onChange={(e) => setFilters({...filters, visita: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itinerários ({filteredData.length} clientes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Fone</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Dt. Base</TableHead>
                <TableHead>Visita</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.razaoSocial}</TableCell>
                  <TableCell>{item.contato}</TableCell>
                  <TableCell>{item.fone}</TableCell>
                  <TableCell>{item.horario}</TableCell>
                  <TableCell>{new Date(item.dtBase).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{item.visita}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => handleReagendar(item.id)}>
                        <Calendar className="h-3 w-3 mr-1" />
                        Re-agendar
                      </Button>
                      <Button size="sm" onClick={() => handleNovoPedido(item.id)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Novo Pedido
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Total de clientes: {filteredData.length}
      </div>
    </div>
  );
};
