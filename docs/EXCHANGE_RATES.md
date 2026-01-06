# Taxas padrão (base → destino) com spread

- Taxa informada = quantos da **moeda base** valem 1 unidade da moeda destino (ex.: `7.5 UYU por 1 BRL`).
- Spread é aplicado nas duas pontas: comprar destino fica mais caro e vender destino devolve um pouco menos.

## Exemplo rápido
Taxa `7.5 UYU por BRL`, spread `5%`:
- Ida (prévia): `1.000 UYU / (7.5 * 1.05) ≈ 126,98 BRL`.
- Volta (prévia): `126,98 BRL * (7.5 / 1.05) ≈ 907 UYU`.

## Onde usar
- Organização > Taxas padrão: prévia de 1.000 (base) usa a taxa informada; spread é armazenado para uso real.
- Serviços (`exchangeRateService`) salvam `rate` e `spread_pct` em `org_exchange_defaults`.

## Dica
- Cadastre só os pares relevantes a partir da moeda base; se a taxa já tiver margem, use spread 0 ou mínimo.
