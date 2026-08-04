import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

export interface PropRow {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

const PropsTable = ({ rows }: { rows: PropRow[] }) => (
  <Paper sx={{ overflow: 'auto', mb: 2 }}>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Prop</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Required</TableCell>
          <TableCell>Description</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>
              <code>{row.name}</code>
            </TableCell>
            <TableCell>
              <code>{row.type}</code>
            </TableCell>
            <TableCell>{row.required ? 'Yes' : 'No'}</TableCell>
            <TableCell>{row.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Paper>
);

export default PropsTable;
