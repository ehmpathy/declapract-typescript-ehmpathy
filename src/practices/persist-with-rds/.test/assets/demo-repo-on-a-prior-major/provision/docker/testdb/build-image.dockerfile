FROM postgres:17.9

COPY init/ /docker-entrypoint-initdb.d/

ADD wait-for-postgres.sh /root/
RUN chmod +x /root/wait-for-postgres.sh
