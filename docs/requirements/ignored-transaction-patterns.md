# Padrões para Ignorar Transações

Last updated: 2026-08-19

## Context

O usuário pode definir padrões que marquem automaticamente como ignoradas somente as novas transações correspondentes. Essas transações deixam de participar dos totais e relatórios, preservando seus demais dados.

## Requirements

1. O usuário pode escolher entre as ações exclusivas **Categorizar** e **Ignorar** ao criar ou editar um padrão.
2. Ao escolher **Ignorar**, o usuário não precisa informar categoria nem descrição de destino.
3. Um padrão de ignorar aceita os mesmos critérios de correspondência disponíveis nos padrões atuais: descrição, data, dia da semana e intervalo de valor.
4. Uma nova transação processada pelo mecanismo de padrões e correspondente a um padrão de ignorar ativo é automaticamente marcada como ignorada.
5. Um padrão de ignorar não altera transações que já existiam quando ele foi criado.
6. Ignorar por padrão preserva descrição, categoria, tags e vínculos da transação.
7. Quando mais de um padrão ativo corresponde à transação, o padrão criado mais recentemente é aplicado.
8. O usuário pode criar um padrão de ignorar nas configurações ou a partir de uma transação.
9. Ao criar um padrão a partir de uma transação já ignorada, a ação **Ignorar** aparece selecionada inicialmente.
10. A lista de padrões identifica visualmente os padrões de ignorar e não oferece neles ações relacionadas a entradas planejadas.
11. Desativar ou excluir um padrão não restaura transações que ele já tenha ignorado.
12. O usuário pode restaurar manualmente uma transação ignorada sem desativar o padrão, que continua valendo para novas transações.
13. A aplicação retroativa não é oferecida para padrões de ignorar.
14. Cada padrão de ignorar afeta somente as transações da organização em que foi criado.
