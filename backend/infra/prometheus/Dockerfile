FROM redhat/ubi9:9.5-1742918310
ENV PROMETHEUS_VERSION=v3.2.1
ARG TARGETARCH
ENV TARGETARCH=${TARGETARCH}
RUN yum install -y unzip jq procps dos2unix && yum clean all

WORKDIR /app
RUN bash -c 'ARCHIVE=prometheus-"${PROMETHEUS_VERSION:1}".linux-"${TARGETARCH}" && \
    curl -sOL https://github.com/prometheus/prometheus/releases/download/"${PROMETHEUS_VERSION}"/"${ARCHIVE}".tar.gz && \
    tar xfz "${ARCHIVE}".tar.gz && \
    mv "${ARCHIVE}" prometheus && \
    rm "${ARCHIVE}".tar.gz'

COPY prometheus.yml .
COPY start.sh .
RUN chmod +x start.sh
EXPOSE 4444
ENTRYPOINT ["./start.sh"]