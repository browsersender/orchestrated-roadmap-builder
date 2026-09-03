# Dependency Graph

- Wave 1 - Constitution: OBS-R00
- Wave 2 - Event foundation: OBS-R01
- Wave 3 - Provider and journal fan-out: OBS-R02, OBS-R03, OBS-R04
- Wave 4 - Hooks: OBS-R05
- Wave 5 - Service: OBS-R06
- Wave 6 - Operator surfaces: OBS-R07, OBS-R08
- Wave 7 - Federation and security: OBS-R09, OBS-R10
- Wave 8 - Qualification and intake: OBS-R11

```text
OBS-R00 -> OBS-R01 -> OBS-R02 --\
                   -> OBS-R03 ----+-> OBS-R06 -> OBS-R07 -> OBS-R08 --\
                   -> OBS-R04 -> OBS-R05 ------------------------------+-> OBS-R11
                              \-> OBS-R06 -> OBS-R09 -----------------+
                                             OBS-R10 -------------------/
```
