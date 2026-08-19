Feature: Padrões para ignorar transações
  Usuários podem ignorar automaticamente somente novas transações correspondentes,
  preservando os demais dados e o controle manual sobre cada transação.

  # REQ 1, REQ 2
  Scenario: Criar um padrão com a ação Ignorar
    Given que o usuário está criando um padrão
    When seleciona a ação "Ignorar"
    Then categoria e descrição de destino deixam de ser obrigatórias

  # REQ 3, REQ 4
  Scenario: Ignorar uma nova transação processada pelo mecanismo de padrões
    Given que existe um padrão de ignorar ativo com critérios de descrição, data, dia da semana e valor
    When uma nova transação é processada pelo mecanismo de padrões e corresponde a todos os critérios informados
    Then a transação é marcada como ignorada

  # REQ 5, REQ 13
  Scenario: Não aplicar um padrão de ignorar retroativamente
    Given que já existem transações correspondentes
    When o usuário cria um padrão de ignorar
    Then as transações existentes permanecem inalteradas
    And a aplicação retroativa não é oferecida para esse padrão

  # REQ 6
  Scenario: Preservar os dados da transação ignorada automaticamente
    Given que uma nova transação possui descrição, categoria, tags e vínculos
    When um padrão correspondente a marca como ignorada
    Then descrição, categoria, tags e vínculos permanecem inalterados

  # REQ 7
  Scenario: Resolver padrões concorrentes pelo mais recente
    Given que mais de um padrão ativo corresponde a uma nova transação
    When os padrões são avaliados
    Then somente o padrão criado mais recentemente é aplicado

  # REQ 8, REQ 9
  Scenario: Criar um padrão a partir de uma transação ignorada
    Given que o usuário abriu uma transação já ignorada
    When inicia a criação de um padrão a partir dela
    Then a ação "Ignorar" aparece selecionada inicialmente

  # REQ 8
  Scenario: Criar um padrão de ignorar nas configurações
    Given que o usuário abriu a área de padrões nas configurações
    When cria um novo padrão
    Then pode selecionar a ação "Ignorar"

  # REQ 10
  Scenario: Identificar um padrão de ignorar na lista
    Given que existe um padrão de ignorar cadastrado
    When o usuário visualiza a lista de padrões
    Then o padrão é identificado como "Ignorar"
    And ações relacionadas a entradas planejadas não são oferecidas

  # REQ 11
  Scenario: Desativar ou excluir sem restaurar transações
    Given que um padrão já ignorou uma ou mais transações
    When o usuário desativa ou exclui o padrão
    Then as transações permanecem ignoradas

  # REQ 12
  Scenario: Restaurar manualmente uma transação
    Given que uma transação foi ignorada por um padrão ativo
    When o usuário restaura manualmente a transação
    Then ela volta a participar dos totais e relatórios
    And o padrão permanece ativo para novas transações

  # REQ 14
  Scenario: Restringir o padrão à organização de origem
    Given que duas organizações possuem transações correspondentes
    And o padrão de ignorar pertence somente à primeira organização
    When novas transações entram nas duas organizações
    Then somente a transação da primeira organização é ignorada
