export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      aggregated_news_sources: {
        Row: {
          active: boolean
          category: string
          created_at: string
          feed_url: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          feed_url: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          feed_url?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregated_news_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: number
          metadata: Json
          target_id: string
          target_table: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id: string
          target_table: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string
          target_table?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      author_identities: {
        Row: {
          created_at: string
          display_mode: Database["public"]["Enums"]["display_mode"]
          id: string
          pen_name: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_mode?: Database["public"]["Enums"]["display_mode"]
          id?: string
          pen_name?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_mode?: Database["public"]["Enums"]["display_mode"]
          id?: string
          pen_name?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "author_identities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          employment_verified_at: string | null
          grade: number | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["membership_role"]
          subject_taught: string | null
          tenant_id: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          employment_verified_at?: string | null
          grade?: number | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["membership_role"]
          subject_taught?: string | null
          tenant_id: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          employment_verified_at?: string | null
          grade?: number | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["membership_role"]
          subject_taught?: string | null
          tenant_id?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_identity_id: string | null
          body: string
          created_at: string
          id: string
          post_id: string
          status: string
          user_id: string
        }
        Insert: {
          author_identity_id?: string | null
          body: string
          created_at?: string
          id?: string
          post_id: string
          status?: string
          user_id: string
        }
        Update: {
          author_identity_id?: string | null
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_identity_id_fkey"
            columns: ["author_identity_id"]
            isOneToOne: false
            referencedRelation: "author_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_identity_id: string | null
          author_user_id: string | null
          body: string | null
          category: string
          cover_image_url: string | null
          created_at: string
          editor_comments: string | null
          external_published_at: string | null
          id: string
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_label: string
          source_name: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["post_status"]
          submitted_at: string | null
          tags: string[]
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }
        Insert: {
          author_identity_id?: string | null
          author_user_id?: string | null
          body?: string | null
          category?: string
          cover_image_url?: string | null
          created_at?: string
          editor_comments?: string | null
          external_published_at?: string | null
          id?: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_label?: string
          source_name?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          submitted_at?: string | null
          tags?: string[]
          tenant_id?: string | null
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Update: {
          author_identity_id?: string | null
          author_user_id?: string | null
          body?: string | null
          category?: string
          cover_image_url?: string | null
          created_at?: string
          editor_comments?: string | null
          external_published_at?: string | null
          id?: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_label?: string
          source_name?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          submitted_at?: string | null
          tags?: string[]
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_identity_id_fkey"
            columns: ["author_identity_id"]
            isOneToOne: false
            referencedRelation: "author_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          id: string
          is_minor: boolean
          phone: string | null
          real_name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id: string
          is_minor?: boolean
          phone?: string | null
          real_name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          is_minor?: boolean
          phone?: string | null
          real_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      recognition_awards: {
        Row: {
          announcement_post_id: string | null
          awarded_at: string
          awarded_by: string
          id: string
          round_id: string
          score_breakdown: Json
          teacher_profile_id: string
        }
        Insert: {
          announcement_post_id?: string | null
          awarded_at?: string
          awarded_by: string
          id?: string
          round_id: string
          score_breakdown: Json
          teacher_profile_id: string
        }
        Update: {
          announcement_post_id?: string | null
          awarded_at?: string
          awarded_by?: string
          id?: string
          round_id?: string
          score_breakdown?: Json
          teacher_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_awards_announcement_post_id_fkey"
            columns: ["announcement_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_awards_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "recognition_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_awards_teacher_profile_id_fkey"
            columns: ["teacher_profile_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_rounds: {
        Row: {
          created_at: string
          id: string
          interval_months: number
          period_end: string
          period_start: string
          round_label: string
          scoring_notes: string | null
          status: Database["public"]["Enums"]["recognition_round_status"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_months?: number
          period_end: string
          period_start: string
          round_label: string
          scoring_notes?: string | null
          status?: Database["public"]["Enums"]["recognition_round_status"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_months?: number
          period_end?: string
          period_start?: string
          round_label?: string
          scoring_notes?: string | null
          status?: Database["public"]["Enums"]["recognition_round_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_rounds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_flags: {
        Row: {
          created_at: string
          flagged_by: string
          id: number
          reason: string
          review_id: string
        }
        Insert: {
          created_at?: string
          flagged_by: string
          id?: never
          reason: string
          review_id: string
        }
        Update: {
          created_at?: string
          flagged_by?: string
          id?: never
          reason?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_flags_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_identity_id: string | null
          body: string | null
          created_at: string
          display_mode: Database["public"]["Enums"]["display_mode"]
          flag_count: number
          id: string
          ratings: Json
          reviewer_role: Database["public"]["Enums"]["reviewer_role"]
          reviewer_user_id: string
          status: Database["public"]["Enums"]["review_status"]
          target_teacher_name: string | null
          target_type: Database["public"]["Enums"]["review_target_type"]
          tenant_id: string
        }
        Insert: {
          author_identity_id?: string | null
          body?: string | null
          created_at?: string
          display_mode?: Database["public"]["Enums"]["display_mode"]
          flag_count?: number
          id?: string
          ratings: Json
          reviewer_role: Database["public"]["Enums"]["reviewer_role"]
          reviewer_user_id: string
          status?: Database["public"]["Enums"]["review_status"]
          target_teacher_name?: string | null
          target_type: Database["public"]["Enums"]["review_target_type"]
          tenant_id: string
        }
        Update: {
          author_identity_id?: string | null
          body?: string | null
          created_at?: string
          display_mode?: Database["public"]["Enums"]["display_mode"]
          flag_count?: number
          id?: string
          ratings?: Json
          reviewer_role?: Database["public"]["Enums"]["reviewer_role"]
          reviewer_user_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          target_teacher_name?: string | null
          target_type?: Database["public"]["Enums"]["review_target_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_identity_id_fkey"
            columns: ["author_identity_id"]
            isOneToOne: false
            referencedRelation: "author_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      study_items: {
        Row: {
          author_identity_id: string | null
          author_user_id: string | null
          board: Database["public"]["Enums"]["board_type"]
          body: string | null
          created_at: string
          file_url: string | null
          grade: number
          id: string
          item_type: Database["public"]["Enums"]["study_item_type"]
          link_url: string | null
          status: Database["public"]["Enums"]["post_status"]
          subject: string
          tags: string[]
          tenant_id: string
          title: string
          topic: string | null
          updated_at: string
          upvote_count: number
        }
        Insert: {
          author_identity_id?: string | null
          author_user_id?: string | null
          board?: Database["public"]["Enums"]["board_type"]
          body?: string | null
          created_at?: string
          file_url?: string | null
          grade: number
          id?: string
          item_type: Database["public"]["Enums"]["study_item_type"]
          link_url?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          subject: string
          tags?: string[]
          tenant_id: string
          title: string
          topic?: string | null
          updated_at?: string
          upvote_count?: number
        }
        Update: {
          author_identity_id?: string | null
          author_user_id?: string | null
          board?: Database["public"]["Enums"]["board_type"]
          body?: string | null
          created_at?: string
          file_url?: string | null
          grade?: number
          id?: string
          item_type?: Database["public"]["Enums"]["study_item_type"]
          link_url?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          subject?: string
          tags?: string[]
          tenant_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
          upvote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_items_author_identity_id_fkey"
            columns: ["author_identity_id"]
            isOneToOne: false
            referencedRelation: "author_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      study_saves: {
        Row: {
          created_at: string
          study_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          study_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          study_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_saves_study_item_id_fkey"
            columns: ["study_item_id"]
            isOneToOne: false
            referencedRelation: "study_items"
            referencedColumns: ["id"]
          },
        ]
      }
      study_upvotes: {
        Row: {
          created_at: string
          study_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          study_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          study_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_upvotes_study_item_id_fkey"
            columns: ["study_item_id"]
            isOneToOne: false
            referencedRelation: "study_items"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_nominations: {
        Row: {
          created_at: string
          id: string
          nominated_by_user_id: string | null
          round_id: string
          statement: string
          supporting_notes: string | null
          teacher_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nominated_by_user_id?: string | null
          round_id: string
          statement: string
          supporting_notes?: string | null
          teacher_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nominated_by_user_id?: string | null
          round_id?: string
          statement?: string
          supporting_notes?: string | null
          teacher_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_nominations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "recognition_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_nominations_teacher_profile_id_fkey"
            columns: ["teacher_profile_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          badge_status: string
          bio: string | null
          created_at: string
          id: string
          subject_taught: string | null
          tenant_id: string
          user_id: string
          years_at_school: number | null
        }
        Insert: {
          badge_status?: string
          bio?: string | null
          created_at?: string
          id?: string
          subject_taught?: string | null
          tenant_id: string
          user_id: string
          years_at_school?: number | null
        }
        Update: {
          badge_status?: string
          bio?: string | null
          created_at?: string
          id?: string
          subject_taught?: string | null
          tenant_id?: string
          user_id?: string
          years_at_school?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          approved_by: string | null
          city: string
          created_at: string
          id: string
          name: string
          requested_by: string | null
          slug: string
          state: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          city?: string
          created_at?: string
          id?: string
          name: string
          requested_by?: string | null
          slug: string
          state?: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          city?: string
          created_at?: string
          id?: string
          name?: string
          requested_by?: string | null
          slug?: string
          state?: string
          status?: string
        }
        Relationships: []
      }
      whistleblower_identity_access_log: {
        Row: {
          accessed_at: string
          id: number
          moderator_id: string
          reason: string
          report_id: string
        }
        Insert: {
          accessed_at?: string
          id?: never
          moderator_id: string
          reason: string
          report_id: string
        }
        Update: {
          accessed_at?: string
          id?: never
          moderator_id?: string
          reason?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whistleblower_identity_access_log_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "whistleblower_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      whistleblower_reports: {
        Row: {
          assigned_moderator_ids: string[]
          category: Database["public"]["Enums"]["whistleblower_category"]
          closed_at: string | null
          contact_encrypted: string
          created_at: string
          description: string
          evidence_urls: string[]
          id: string
          identity_purge_requested_at: string | null
          identity_purged_at: string | null
          public_closure_summary: string | null
          safety_flag: boolean
          safety_flag_reason: string | null
          safety_flag_set_at: string | null
          safety_flag_set_by: string | null
          status: Database["public"]["Enums"]["whistleblower_status"]
          submitter_user_id: string | null
          tenant_id: string
          tracking_id: string
        }
        Insert: {
          assigned_moderator_ids?: string[]
          category: Database["public"]["Enums"]["whistleblower_category"]
          closed_at?: string | null
          contact_encrypted: string
          created_at?: string
          description: string
          evidence_urls?: string[]
          id?: string
          identity_purge_requested_at?: string | null
          identity_purged_at?: string | null
          public_closure_summary?: string | null
          safety_flag?: boolean
          safety_flag_reason?: string | null
          safety_flag_set_at?: string | null
          safety_flag_set_by?: string | null
          status?: Database["public"]["Enums"]["whistleblower_status"]
          submitter_user_id?: string | null
          tenant_id: string
          tracking_id: string
        }
        Update: {
          assigned_moderator_ids?: string[]
          category?: Database["public"]["Enums"]["whistleblower_category"]
          closed_at?: string | null
          contact_encrypted?: string
          created_at?: string
          description?: string
          evidence_urls?: string[]
          id?: string
          identity_purge_requested_at?: string | null
          identity_purged_at?: string | null
          public_closure_summary?: string | null
          safety_flag?: boolean
          safety_flag_reason?: string | null
          safety_flag_set_at?: string | null
          safety_flag_set_by?: string | null
          status?: Database["public"]["Enums"]["whistleblower_status"]
          submitter_user_id?: string | null
          tenant_id?: string
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whistleblower_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whistleblower_status_log: {
        Row: {
          created_at: string
          id: number
          moderator_id: string | null
          note_internal: string | null
          note_public: string | null
          report_id: string
          status: Database["public"]["Enums"]["whistleblower_status"]
        }
        Insert: {
          created_at?: string
          id?: never
          moderator_id?: string | null
          note_internal?: string | null
          note_public?: string | null
          report_id: string
          status: Database["public"]["Enums"]["whistleblower_status"]
        }
        Update: {
          created_at?: string
          id?: never
          moderator_id?: string | null
          note_internal?: string | null
          note_public?: string | null
          report_id?: string
          status?: Database["public"]["Enums"]["whistleblower_status"]
        }
        Relationships: [
          {
            foreignKeyName: "whistleblower_status_log_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "whistleblower_reports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_moderate_tenant: {
        Args: {
          roles: Database["public"]["Enums"]["membership_role"][]
          t_id: string
          uid: string
        }
        Returns: boolean
      }
      generate_tracking_id: { Args: never; Returns: string }
      get_report_status_by_tracking_id: {
        Args: { p_tracking_id: string }
        Returns: {
          category: Database["public"]["Enums"]["whistleblower_category"]
          closed_at: string
          created_at: string
          latest_public_note: string
          status: Database["public"]["Enums"]["whistleblower_status"]
          tracking_id: string
        }[]
      }
      has_tenant_role: {
        Args: {
          roles: Database["public"]["Enums"]["membership_role"][]
          t_id: string
          uid: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { uid: string }; Returns: boolean }
      is_verified_member: {
        Args: {
          roles: Database["public"]["Enums"]["membership_role"][]
          t_id: string
          uid: string
        }
        Returns: boolean
      }
      reveal_author_identity: {
        Args: { p_author_identity_id: string; p_reason: string }
        Returns: {
          real_name: string
        }[]
      }
      reveal_whistleblower_identity: {
        Args: { p_reason: string; p_report_id: string }
        Returns: {
          contact_encrypted: string
        }[]
      }
      submit_whistleblower_report: {
        Args: {
          p_category: Database["public"]["Enums"]["whistleblower_category"]
          p_contact_encrypted: string
          p_description: string
          p_evidence_urls: string[]
          p_tenant_id: string
        }
        Returns: string
      }
    }
    Enums: {
      board_type: "state_board" | "cbse" | "icse" | "other"
      display_mode: "real" | "pen_name" | "anonymous"
      membership_role:
        | "student"
        | "teacher"
        | "editor"
        | "moderator"
        | "school_admin"
      post_status: "draft" | "in_review" | "published" | "rejected" | "archived"
      post_type: "news_campus" | "news_aggregated" | "event" | "announcement"
      recognition_round_status: "open" | "scoring" | "awarded" | "closed"
      review_status: "pending" | "published" | "flagged" | "removed"
      review_target_type: "school" | "teacher"
      reviewer_role: "student" | "teacher"
      study_item_type: "note" | "pdf" | "image" | "link"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
      whistleblower_category:
        | "harassment"
        | "safety"
        | "financial_administrative"
        | "facilities"
        | "discrimination"
        | "other"
      whistleblower_status:
        | "received"
        | "under_review"
        | "verified_contacted"
        | "action_taken"
        | "escalated"
        | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      board_type: ["state_board", "cbse", "icse", "other"],
      display_mode: ["real", "pen_name", "anonymous"],
      membership_role: [
        "student",
        "teacher",
        "editor",
        "moderator",
        "school_admin",
      ],
      post_status: ["draft", "in_review", "published", "rejected", "archived"],
      post_type: ["news_campus", "news_aggregated", "event", "announcement"],
      recognition_round_status: ["open", "scoring", "awarded", "closed"],
      review_status: ["pending", "published", "flagged", "removed"],
      review_target_type: ["school", "teacher"],
      reviewer_role: ["student", "teacher"],
      study_item_type: ["note", "pdf", "image", "link"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
      whistleblower_category: [
        "harassment",
        "safety",
        "financial_administrative",
        "facilities",
        "discrimination",
        "other",
      ],
      whistleblower_status: [
        "received",
        "under_review",
        "verified_contacted",
        "action_taken",
        "escalated",
        "closed",
      ],
    },
  },
} as const