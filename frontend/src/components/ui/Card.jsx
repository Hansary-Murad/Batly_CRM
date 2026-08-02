import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export const Card = React.forwardRef(({ className, hover, ...props }, ref) => (
  <motion.div whileHover={hover ? { y: -4, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' } : {}} transition={{ duration: 0.2 }}>
    <div ref={ref} className={cn('rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm backdrop-blur-sm', className)} {...props} />
  </motion.div>
))
Card.displayName = 'Card'

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
))
CardTitle.displayName = 'CardTitle'

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'
