# Domain model — academic / enrollment (ClassApp)

Harvest: 2026-08-14. ClassApp is not a full SIS; academic scope is **enrollment campaigns** + roster sync.

## Entities

### Enrollment campaign (`campanha de matrículas`)

Container for online enrollment with forms, contracts, bulk send/archive.

### Student roster (`alunos`)

Imported via spreadsheet or ERP integration; linked to communication profiles.

### Contract template

School signature configuration on standard contracts; bulk contract dispatch.

### Form (`formulário`)

Guardian-fillable forms; export capability documented.
