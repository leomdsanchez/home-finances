# TODO Tests

- [x] Categorias: erro ao criar duplicada (mesmo nome na mesma organização).
- [x] Contas: erro ao criar duplicada (mesmo nome na mesma organização).
- [x] Budgets: erro de FK/organização errada (categoria de outra org).
- [x] Transações: atualizar outros campos além de amount/note (categoria, data, currency) e validar erro de org errada.
- [x] Transações: validar currency/exchangeRate coerentes com a conta na transferência (rejeitar mismatch).
- [x] RLS: impedir leitura/criação em organização onde o usuário não é membro para cada serviço (account/category/budget/transaction).
- [x] Transfers: tentar deletar só uma perna (deleteTransaction) e verificar se a outra permanece — decidir comportamento e cobrir.
- [x] Organização: remover membership e tentar operar em org (deve falhar por RLS) — teste negativo (coberto em organizationService).
