import { SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';
import { listTeachers } from 'services/academicsApi';
import { listGuardians } from 'services/guardiansApi';
import { listStudents } from 'services/studentsApi';
import sitemap from 'routes/sitemap';
import { formatCpf } from 'utils/documentNumber';
import { matchesTerm } from 'utils/searchTerm';
import { useDebouncedValue } from 'utils/useDebouncedValue';

export interface SearchResult {
  /** Unique across groups, so two people sharing a name never collide as options. */
  key: string;
  group: string;
  label: string;
  description?: string;
  to: string;
}

/** Below this the result list is more noise than help, and every keystroke would hit the API. */
const MIN_TERM_LENGTH = 2;

/** Enough to recognise the right row without turning the dropdown into a listing. */
const MAX_PER_GROUP = 5;

const GROUPS = {
  pages: 'Páginas',
  guardians: 'Responsáveis',
  students: 'Estudantes',
  collaborators: 'Colaboradores',
};

/**
 * The menu's search box. It looks in two places: the pages this user can reach, and the people
 * registers — so a name or a CPF typed here lands on the record without hunting through screens.
 *
 * Selecting a person opens their listing already filtered by CPF, which is what the `?q=` on each
 * listing route is for.
 */
const GlobalSearch = () => {
  const navigate = useNavigate();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [term, setTerm] = useState('');
  const [people, setPeople] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedTerm = useDebouncedValue(term);
  const { t } = useTranslation();

  const isSearching = debouncedTerm.trim().length >= MIN_TERM_LENGTH;

  // Pages come from the same sitemap the nav is built from, so the two can never disagree.
  const pageResults = useMemo<SearchResult[]>(() => {
    if (!isSearching) {
      return [];
    }

    return sitemap
      .filter((item) => item.path && matchesTerm(t(item.subheader as MessageKey), debouncedTerm))
      .map((item) => ({
        key: `page-${item.id}`,
        group: GROUPS.pages,
        label: t(item.subheader as MessageKey),
        to: item.path as string,
      }));
  }, [debouncedTerm, isSearching, t]);

  useEffect(() => {
    // The people registers are staff-only; a guardian gets pages alone rather than three 403s.
    // Nothing is reset here — what is shown is derived below, so a short term simply hides the
    // last results instead of writing state from the effect.
    if (!isSearching || !schoolId) {
      return;
    }

    let cancelled = false;

    const search = async () => {
      setLoading(true);

      // One rejected source must not hide the other two, so each is settled on its own.
      const [guardians, students, collaborators] = await Promise.allSettled([
        listGuardians({ schoolId, q: debouncedTerm }),
        listStudents({ schoolId, q: debouncedTerm }),
        listTeachers({ schoolId, q: debouncedTerm }),
      ]);

      if (cancelled) {
        return;
      }

      const results: SearchResult[] = [];

      if (guardians.status === 'fulfilled') {
        guardians.value.data.slice(0, MAX_PER_GROUP).forEach((guardian) => {
          results.push({
            key: `guardian-${guardian.id}`,
            group: GROUPS.guardians,
            label: guardian.name,
            description: `CPF ${formatCpf(guardian.cpf)}`,
            to: `/pessoas/responsaveis?q=${encodeURIComponent(guardian.cpf)}`,
          });
        });
      }

      if (students.status === 'fulfilled') {
        students.value.data.slice(0, MAX_PER_GROUP).forEach((student) => {
          results.push({
            key: `student-${student.id}`,
            group: GROUPS.students,
            label: student.name,
            description: student.school_class_name
              ? `Turma ${student.school_class_name}`
              : `CPF ${formatCpf(student.cpf)}`,
            to: `/pessoas/estudantes?q=${encodeURIComponent(student.cpf)}`,
          });
        });
      }

      if (collaborators.status === 'fulfilled') {
        collaborators.value.data.slice(0, MAX_PER_GROUP).forEach((collaborator) => {
          results.push({
            key: `collaborator-${collaborator.id}`,
            group: GROUPS.collaborators,
            label: collaborator.name,
            description: collaborator.job_title ?? undefined,
            to: `/academico/colaboradores?q=${encodeURIComponent(collaborator.cpf)}`,
          });
        });
      }

      setPeople(results);
      setLoading(false);
    };

    search();

    // A slower earlier request must not overwrite the results of a newer term.
    return () => {
      cancelled = true;
    };
  }, [debouncedTerm, isSearching, schoolId]);

  const options = useMemo(() => {
    // Stale results from a previous term stay out of view until the new ones land.
    const peopleResults = isSearching && schoolId ? people : [];

    return [...pageResults, ...peopleResults];
  }, [pageResults, people, isSearching, schoolId]);

  const handleSelect = (_event: SyntheticEvent, value: SearchResult) => {
    setTerm('');
    navigate(value.to);
  };

  // Deliberately not `freeSolo`: this box is a picker, and freeSolo suppresses `noOptionsText` —
  // the only way it can say it found nothing.
  //
  // `disableClearable` and `forcePopupIcon={false}` keep the control the same size as the plain
  // field it replaced: Autocomplete would otherwise reserve room on the right for a dropdown
  // arrow and a clear button, widening it inside the 300px drawer.
  return (
    <Autocomplete<SearchResult, false, true, false>
      disableClearable
      forcePopupIcon={false}
      openOnFocus={false}
      // The API has already filtered; re-filtering here would drop rows matched by CPF.
      filterOptions={(all) => all}
      options={options}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, value) => option.key === value.key}
      inputValue={term}
      onInputChange={(_event, value, reason) => {
        // `reset` fires when an option is picked; clearing is handled in handleSelect.
        if (reason !== 'reset') {
          setTerm(value);
        }
      }}
      onChange={handleSelect}
      loading={loading}
      // Only speak up once the term is long enough to have been searched at all.
      noOptionsText={isSearching ? 'Nada encontrado' : 'Digite ao menos 2 caracteres'}
      renderOption={(props, option) => {
        const { key, ...rest } = props as typeof props & { key: string };

        return (
          <Stack
            component="li"
            key={key}
            {...rest}
            direction="column"
            alignItems="flex-start !important"
          >
            <Typography variant="body2">{option.label}</Typography>
            {option.description && (
              <Typography variant="caption" color="text.secondary">
                {option.description}
              </Typography>
            )}
          </Stack>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="filled"
          placeholder="Buscar pessoas e páginas..."
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <IconifyIcon icon="mingcute:search-line" />
                </InputAdornment>
              ),
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <CircularProgress size={16} />
                </InputAdornment>
              ) : (
                params.InputProps.endAdornment
              ),
            },
            htmlInput: {
              ...params.inputProps,
              'aria-label': 'Buscar',
            },
          }}
        />
      )}
      sx={{ width: 1 }}
    />
  );
};

export default GlobalSearch;
