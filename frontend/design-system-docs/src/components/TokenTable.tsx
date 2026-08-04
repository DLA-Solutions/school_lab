import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

export interface TokenRow {
  token: string;
  dark: string;
  light: string;
}

const TokenTable = ({ rows }: { rows: TokenRow[] }) => (
  <Paper sx={{ overflow: 'auto' }}>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Token</TableCell>
          <TableCell>Dark</TableCell>
          <TableCell>Light</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.token}>
            <TableCell>
              <code>{row.token}</code>
            </TableCell>
            <TableCell>{row.dark}</TableCell>
            <TableCell>{row.light}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Paper>
);

export default TokenTable;
