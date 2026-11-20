---
title: "Meta’s Muse AI Agent Mixing Conversations and Exposing Private Data, Internal Reports Show"
description: "After a September launch that drew over 10 million downloads, Meta’s AI assistant Muse has been flagged by employees for mixing up user chats and leaking sensitive information, according to Reuters‑reviewed internal posts."
slug: "meta-s-muse-ai-agent-mixing-conversations-and-exposing-private-data-internal-reports-show"
category: "AI"
author: "Tejendra Pal Singh"
publishedAt: "2026-11-20T00:03:32.729Z"
image: "/Trendforge/images/articles/meta-s-muse-ai-agent-mixing-conversations-and-exposing-private-data-internal-reports-show.1024x576.png"
imageAlt: "Editorial image for Meta’s Muse AI Agent Mixing Conversations and Exposing Private Data, Internal Reports Show"
imageSource: "Cloudflare Workers AI — FLUX.1 Schnell"
imageLicense: "Model-generated"
imageGeneratedBy: "Cloudflare FLUX.1 Schnell"
---

## Internal Findings of Conversation Mix‑Ups
Meta employees have raised concerns that the company’s AI agent Muse has been mixing up conversations across different accounts and exposing private user data, according to a new Reuters report that looked at internal company posts. In some of these instances, employees said Muse surfaced messages about childcare requests they never made, career advice they never asked for, product orders they never placed, and bank account balances that didn’t belong to them. One employee told colleagues that Muse had randomly sent an extra message in a chat about weather and tide information, saying: “BTW, two bank updates, your Capital One balance is $2722.58, your Charles Schwab balance is $5899.57.”

These incidents were flagged as early as launch week, yet Meta proceeded with the September 2026 U.S. launch on schedule. Internal posts also described incidents where Muse appeared to be mixing up conversations between different user accounts, and employees flagged safety issues “as recently as launch week” while Meta proceeded with the September 2026 U.S. launch as scheduled.

## Company Response and Testing Practices
A Meta spokesperson said that employee testing is core to the product development process and that the entire point is to get feedback so the company can implement safety and privacy protections and improve products. The spokesperson added that employees have access to different versions of Muse than the public, so they’re often reviewing features, functionality, and behavior not available elsewhere. When asked about the specific incidents, Meta spokesperson Daniel Roberts told TechCrunch that the examples described by Reuters were “isolated incidents.”

Despite the spokesperson’s framing, other internal posts noted that Muse accessed private Signal messages on the device where it was installed, made possible by the broad Android notification permissions the app requests. The company also stated that many messages identified as possible account mix‑ups were hallucinations and that some problems had already been addressed.

## Broader Security Implications
A security firm, Claroc, discovered that the chat‑sharing feature in Muse exposed shared conversations through publicly searchable DNS records. Researchers needed a single DNS query to surface thousands of previously shared chat links, all of which were accessible to anyone who found them, without any login requirement. The exposed conversations were created by users who had explicitly chosen to share them with specific recipients but did not expect that those links would be discoverable by third parties. These findings suggest that the product’s design may allow unintended data leaks beyond the immediate conversation.

## Scale of Adoption and Potential Impact
Muse was launched in September and is one of the fastest‑growing apps on record, with more than 10 million downloads. Meta expected Muse to generate billions of dollars in revenue from AI, while La Nación described internal postings reviewed by Reuters as showing unsolicited actions including infiltrating encrypted personal messages and sending conversations that appeared destined for other people.

## Uncertainties and Next Steps
The Defense Watch noted that Reuters could not establish whether unfamiliar financial information represented actual exposure of another person’s data or information fabricated by the AI model. Meta’s position is that many of the messages were hallucinations, but the company has already addressed some of the problems. Employees continue to flag safety issues, and the company’s safety and privacy protections are still under review.

Readers should watch for updates on whether Meta will adjust Muse’s permission model, modify its privacy safeguards, or pause new features while addressing the highlighted concerns.

## What the Evidence Shows
Internal posts reveal that Muse mixed up conversations and exposed private data, prompting employees to flag safety issues during launch week.


## Sources

- [Meta’s AI agent Muse is mixing up conversations and could be exposing private data, report says](https://techcrunch.com/2026/11/19/metas-ai-agent-muse-is-mixing-up-conversations-and-exposing-private-data-report-says/)
- [Meta Employees Raise Privacy Concerns Over Muse AI Mixing Up Accounts: 5 outlets compared - NewsCord](https://newscord.org/article/meta-employees-raise-privacy-concerns-over-muse-ai-mixing-up-accounts--Story_20261119_MetasAIagentMuseismic46c57c5)
- [Meta Employees Raise Muse AI Privacy Concerns, Exposing Security Flaws, Chat Leaks](https://www.techtimes.com/articles/331080/20261119/meta-employees-raise-muse-ai-privacy-concerns-exposing-security-flaws-chat-leaks.htm)

