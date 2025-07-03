# MindSphere - AI Personal Assistant

## Overview

MindSphere is a comprehensive AI-powered personal assistant application built with a modern full-stack architecture. The application combines a React frontend with an Express backend, utilizing PostgreSQL for data persistence and OpenAI for AI capabilities. The system is designed to help users manage their entire digital life through conversational AI, task management, health tracking, financial monitoring, and analytics.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system (dark theme optimized)
- **Component Library**: Radix UI components with shadcn/ui
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-based session store

### Key Components

#### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL with connect-pg-simple
- **User Management**: Comprehensive user profile system with preferences
- **Security**: HTTP-only cookies with secure session management

#### AI Integration
- **Provider**: OpenAI GPT-4o model
- **Conversation Management**: Multi-conversation support with context awareness
- **Personality**: Configured as MindSphere with helpful, supportive, and personalized responses
- **Features**: Text-based conversations with future voice integration capabilities

#### Data Management
- **Database Schema**: Comprehensive schema supporting:
  - User profiles and preferences
  - Conversation and message history
  - Task management with priorities and due dates
  - Health tracking (sleep, steps, weight, mood, energy)
  - Financial tracking (income/expenses with categorization)
  - Mood and journal entries
- **Type Safety**: Full TypeScript integration with Drizzle schema validation
- **Migrations**: Automated database schema management

#### Life Management Modules
- **Task Management**: Priority-based task system with status tracking
- **Health Tracking**: Daily health metrics with trend analysis
- **Financial Management**: Income/expense tracking with categorization
- **Mood Tracking**: Daily mood and energy level monitoring
- **Analytics**: AI-powered insights and pattern recognition

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, creating/updating user profiles
2. **Conversation Flow**: Users interact with AI through chat interface, with conversations persisted
3. **Data Collection**: Life data (tasks, health, finances) collected through dedicated interfaces
4. **AI Processing**: OpenAI analyzes user data and conversation history for personalized responses
5. **Analytics Generation**: System generates insights and recommendations based on user patterns
6. **Real-time Updates**: TanStack Query ensures UI stays synchronized with backend data

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **openai**: AI conversation capabilities
- **@tanstack/react-query**: Client-side state management
- **@radix-ui/react-***: Comprehensive UI component library
- **tailwindcss**: Utility-first CSS framework

### Authentication & Security
- **openid-client**: OpenID Connect authentication
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Development & Build
- **vite**: Fast build tool and development server
- **typescript**: Type safety across the entire stack
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast bundling for production

## Deployment Strategy

### Development
- **Local Development**: Vite dev server with Express backend
- **Hot Reload**: Full-stack hot reloading with Vite middleware
- **Environment**: NODE_ENV=development with debug logging

### Production
- **Build Process**: 
  1. Vite builds React frontend to `dist/public`
  2. esbuild bundles Express server to `dist/index.js`
- **Deployment**: Single Node.js process serving both frontend and API
- **Database**: Neon PostgreSQL with connection pooling
- **Environment Variables**: 
  - `DATABASE_URL`: PostgreSQL connection string
  - `OPENAI_API_KEY`: OpenAI API access
  - `SESSION_SECRET`: Session encryption key
  - `REPLIT_DOMAINS`: Allowed domains for auth

### Scaling Considerations
- **Database**: Connection pooling with Neon serverless
- **Session Storage**: PostgreSQL-based for horizontal scaling
- **Static Assets**: Served directly from Express in production
- **API Rate Limiting**: Built-in request logging and monitoring

## Changelog

Changelog:
- July 03, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.