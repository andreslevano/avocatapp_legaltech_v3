#!/bin/bash
# Script simplificado para rollback
firebase use avocat-legaltech-v3 && firebase hosting:rollback --version f0ccae
