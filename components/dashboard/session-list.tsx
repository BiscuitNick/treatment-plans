'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar } from "lucide-react";
import { DashboardSession } from "@/app/actions/sessions";

interface SessionListProps {
  sessions: DashboardSession[];
}

export function SessionList({ sessions }: SessionListProps) {
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sessions</CardTitle>
        <CardDescription>
          Manage your patient sessions and treatment plans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Patient/User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latest Plan</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No sessions found. Upload one to get started.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => {
                const hasPlan = session.plans.length > 0;
                const latestVersion = hasPlan ? session.plans[0].versions[0] : null;
                
                return (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(session.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                        {session.user.name || session.user.email}
                        {/* Note: In the current schema user is the clinician. 
                            Ideally we'd show Client Name here if the schema supported it. */}
                    </TableCell>
                    <TableCell>
                      {hasPlan ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Processed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Pending Analysis
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasPlan ? (
                         <span className="text-xs text-muted-foreground">
                           v{latestVersion?.version} • {formatDate(latestVersion?.createdAt || new Date())}
                         </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
