# SMART Healthcare Scheduling Platform

## Overview

This is a FHIR-compliant healthcare appointment scheduling platform that enables patients to search for healthcare providers and book appointments seamlessly. The application synchronizes with FHIR data sources to provide real-time availability and supports SMART scheduling deep-linking for appointment booking. Built as a full-stack TypeScript application with React frontend and Express backend, it provides an intuitive interface for healthcare appointment discovery and booking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with FHIR-compliant endpoints
- **Data Sync**: Automated FHIR bulk data synchronization using cron jobs
- **Request Handling**: Centralized error handling and logging middleware

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon Database serverless PostgreSQL
- **Schema**: FHIR-compliant tables for Location, PractitionerRole, Schedule, and Slot resources
- **Storage Interface**: Abstracted storage layer with in-memory fallback for development

### Data Synchronization
- **FHIR Integration**: Bulk data import from FHIR-compliant endpoints
- **Sync Strategy**: Scheduled synchronization using node-cron for real-time data updates
- **Data Format**: NDJSON (newline-delimited JSON) processing for FHIR bulk exports
- **Resource Types**: Location, PractitionerRole, Schedule, and Slot resources

### Authentication and Booking
- **SMART Scheduling**: Deep-linking integration for provider booking systems
- **Booking Flow**: External redirect to provider-specific scheduling platforms
- **Session Management**: Basic session handling for user preferences

## External Dependencies

### Core Infrastructure
- **Database**: Neon Database (PostgreSQL) for production data storage
- **FHIR Data Source**: External FHIR bulk data endpoints for healthcare provider information
- **Google Maps**: Maps integration for location visualization and search

### Third-Party Services
- **SMART Scheduling**: Provider booking systems for appointment completion
- **FHIR Bulk Data API**: Zocdoc SMART scheduling demo endpoint for test data

### Development Tools
- **Replit Integration**: Development environment plugins for error overlay and debugging
- **Build Pipeline**: Vite with esbuild for production builds
- **Type Safety**: TypeScript with strict configuration across full stack

### UI and Interaction Libraries
- **Component Library**: Radix UI primitives for accessible UI components
- **Styling**: Tailwind CSS with custom color scheme and design tokens
- **Form Handling**: React Hook Form with Zod validation
- **Date/Time**: date-fns for date manipulation and formatting
- **Charts**: Recharts for data visualization components