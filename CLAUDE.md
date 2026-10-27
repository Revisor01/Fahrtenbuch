# Hinweise für Coding-Agenten

Projektanweisungen, Übergaben und Betriebswissen liegen nicht in diesem
Repository, sondern in einer privaten Ablage des Autors. Wer ohne diese Ablage
arbeitet, hält sich an die folgenden Regeln.

## Grundsätze

- Änderungen nur über einen Pull Request auf `master`. Ein Thema pro PR.
- Commits nach [Conventional Commits](https://www.conventionalcommits.org/de/),
  Betreff im Präsens, höchstens 72 Zeichen, auf Deutsch oder Englisch.
- Jede Änderung, die Nutzer:innen bemerken, kommt im selben PR in
  `CHANGELOG.md` unter `[Unreleased]`
  ([Keep a Changelog](https://keepachangelog.com/de/1.1.0/)).
- Neues Verhalten bekommt einen Test, eine Fehlerbehebung zuerst den Test, der
  den Fehler zeigt.
- Keine neuen Abhängigkeiten ohne Rücksprache.
- In dieses Repository gehören keine Zugangsdaten, Hostnamen privater Server,
  lokalen Pfade, Testkonten oder Arbeitsnotizen, auch nicht in
  Commit-Nachrichten, PR-Texten oder Kommentaren. Der Secret-Scan in CI prüft
  das.

## Kommentare

> **Kommentare.** Ein Kommentar ist eine Zeile und sagt, warum etwas so ist.
> Nicht, was der Code tut, nicht, wie es dazu kam, keine Merksätze, keine
> Erklärprosa. So reicht es: „Deploy-Skript statt Portainer-Webhook: auf dem
> Zielserver läuft kein Portainer.“ Zwei Zeilen nur, wenn sonst ein Fehler
> droht; Vorgeschichte gehört in die Commit-Nachricht. Ein Dateikopf nennt in
> einer Zeile, was die Datei ist, dazu höchstens der Aufruf. Der Quelltext ist
> zum Veröffentlichen geschrieben: keine Hostnamen, IPs, Server- oder
> Proxy-Aufbau, Stack- oder Registry-IDs, Auftragsnummern, Befundkennungen,
> Agenten, Namen außer dem Autor, keine wörtlichen Zitate von Entscheidungen,
> kein Verweis auf die Werkstatt. Kein `TODO` ohne Issue-Nummer, kein
> auskommentierter Code. Wer einen Kommentar anfasst, kürzt ihn auf diese
> Regel. Gegenprobe vor jedem Merge: der Prüf-Scan des Repos meldet „Prüfung
> ohne Treffer"; wo es einen Quelltext-Export gibt, ist das `node
> scripts/quelltext-export/export.mjs HEAD`, sonst gitleaks mit der
> Konfiguration der Werkstatt.
