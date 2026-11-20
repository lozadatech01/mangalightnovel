import type { SupplyProfile } from "./supply-model";

export const profiles: Record<string, SupplyProfile> = {
  "creator": {
    "primary": "Titles",
    "nextTab": "Submissions",
    "singular": "title declaration",
    "receipt": "Rights review requested",
    "pending": "Chapter submission opens after effective submission permission is recorded for the exact edition.",
    "fields": [
      {
        "key": "content_kind",
        "label": "Content type",
        "type": "choice",
        "required": true,
        "choices": {
          "MANGA": "Manga",
          "LIGHT_NOVEL": "Light novel"
        }
      },
      {
        "key": "language",
        "label": "Edition or delivery language",
        "type": "text",
        "required": true,
        "maxLength": 48
      },
      {
        "key": "format",
        "label": "Edition format",
        "type": "text",
        "required": true,
        "maxLength": 80
      },
      {
        "key": "contributors",
        "label": "Contributor roles and claim references",
        "type": "long",
        "required": true,
        "maxLength": 2000
      },
      {
        "key": "claimants",
        "label": "Rightsholder and coholder claim references",
        "type": "long",
        "required": true,
        "maxLength": 2000
      },
      {
        "key": "requested_scope",
        "label": "Requested publication channels, territories and dates",
        "type": "long",
        "required": true,
        "maxLength": 2000
      },
      {
        "key": "claim_evidence",
        "label": "Chain-of-title evidence references or unresolved claims",
        "type": "long",
        "required": false,
        "maxLength": 2000
      }
    ],
    "invited": false
  },
  "publisher": {
    "primary": "Titles",
    "nextTab": "Deliveries",
    "singular": "catalog edition",
    "receipt": "Catalog row received for review",
    "pending": "Content delivery requires the independently reviewed title grant and effective permission to submit the edition.",
    "fields": [
      {
        "key": "content_kind",
        "label": "Content type",
        "type": "choice",
        "required": true,
        "choices": {
          "MANGA": "Manga",
          "LIGHT_NOVEL": "Light novel"
        }
      },
      {
        "key": "language",
        "label": "Edition or delivery language",
        "type": "text",
        "required": true,
        "maxLength": 48
      },
      {
        "key": "format",
        "label": "Edition format",
        "type": "text",
        "required": true,
        "maxLength": 80
      },
      {
        "key": "namespace",
        "label": "Source catalog namespace",
        "type": "text",
        "required": true,
        "maxLength": 120
      },
      {
        "key": "external_id",
        "label": "External edition ID",
        "type": "text",
        "required": true,
        "maxLength": 160
      },
      {
        "key": "batch_id",
        "label": "Source batch ID",
        "type": "text",
        "required": true,
        "maxLength": 160
      },
      {
        "key": "source_row",
        "label": "Source row ID",
        "type": "text",
        "required": true,
        "maxLength": 100
      },
      {
        "key": "source_revision",
        "label": "Source revision or version",
        "type": "text",
        "required": true,
        "maxLength": 80
      },
      {
        "key": "contributors",
        "label": "Contributor and source evidence references",
        "type": "long",
        "required": true,
        "maxLength": 2000
      },
      {
        "key": "identifiers",
        "label": "ISBN or other external identifier claims",
        "type": "long",
        "required": false,
        "maxLength": 2000
      }
    ],
    "invited": false
  }
};
